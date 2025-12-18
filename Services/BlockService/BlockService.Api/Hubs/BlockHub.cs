using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.Models.BlockImage;
using BlockService.Models.BlockText;
using BlockService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace BlockService.Api.Hubs
{
    public class BlockHub(IConnectionTracker connectionTracker,
        IBlockService blockService,
        IBlockRepository blockRepository,
        IBlockImageRepository blockImageRepository,
        IDocumentParticipantService documentParticipantService,
        IBlockImageService blockImageService
        ) : BaseHub
    {
        public async Task SendBlock(SendBlockRequest request)
        {
            try
            {
                request.UserId = Id;
                var message = await blockService.SendBlock(request);
                await Clients.Group($"Document{message.DocumentId}").SendAsync("ReceiveBlock", message);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task EditBlock(EditBlockRequest request)
        {
            try
            {
                request.UserId = Id;
                var editedBlock = await blockService.EditBlock(request);
                await Clients.Group($"Document{editedBlock.DocumentId}").SendAsync("BlockEdited", editedBlock);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task<BlockImage> SendBlockImage(SendBlockImageRequest request, FileUpload file)
        {
            Console.WriteLine("➡️ Вызван метод SendBlockImage (Hub)");
            try
            {
                request.UserId = Id;
                Console.WriteLine($"🔹 UserId: {request.UserId}, BlockId: {request.BlockId}");

                var block = await blockRepository.GetBlockById(request.BlockId);
                if (block == null)
                {
                    Console.WriteLine("❌ Блок не найден");
                    throw new Exception($"Блок с ID {request.BlockId} не найден");
                }

                int documentId = block.DocumentId;
                Console.WriteLine($"🔹 DocumentId: {documentId}");

                var blockImage = await blockImageService.SendBlockImage(request, file);

                Console.WriteLine($"✅ Изображение успешно обработано, Id: {blockImage.Id}, Url: {blockImage.Url}");

                await Clients.Group($"Document{documentId}")
                             .SendAsync("ReceiveBlockImage", blockImage);
                Console.WriteLine("📤 Отправлено клиентам в группе");
                return blockImage;
            }
            catch (Exception e)
            {
                Console.WriteLine($"❌ Ошибка в SendBlockImage (Hub): {e.GetType().Name} - {e.Message}");
                Console.WriteLine($"📄 StackTrace: {e.StackTrace}");
                throw new HubException("Ошибка при обработке изображения: " + e.Message);
            }
        }

        public async Task DeleteBlockImage(int imageId)
        {
            Console.WriteLine("хаб удаления");
            var image = await blockImageRepository.GetImageById(imageId);
            var block = await blockRepository.GetBlockById(image.BlockId);
            int documentId = block.DocumentId;
            try
            {
                await blockImageService.DeleteBlockImage(imageId, Id);
                await Clients.Group($"Document{documentId}")
                             .SendAsync("BlockImageDeleted", imageId);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task DeleteBlock(int blockId)
        {
            try
            {
                var userId = Id;

                var block = await blockRepository.GetBlockById(blockId);
                if (block == null)
                    throw new HubException($"Блок с ID {blockId} не найден");

                var documentId = block.DocumentId;

                await blockService.DeleteBlock(blockId, userId);

                await Clients.Group($"Document{documentId}")
                             .SendAsync("BlockDeleted", blockId);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task<List<BlockImage>> GetBlockImagesByBlock(int blockId)
        {
            try
            {
                var blockImages = await blockImageService.GetBlockImagesByBlock(Id, blockId);
                return blockImages;
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public override async Task OnConnectedAsync()
        {
            connectionTracker.TrackConnection(Context.ConnectionId, Id);

            var documentParticipants = await documentParticipantService.GetDocumentParticipantsByUserId(Id);
            var documentIds = documentParticipants.Select(x => x.DocumentId);
            await Task.WhenAll(documentIds.Select(documentId => Groups.AddToGroupAsync(Context.ConnectionId, $"Document{documentId}")));

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            connectionTracker.UntrackConnection(Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
