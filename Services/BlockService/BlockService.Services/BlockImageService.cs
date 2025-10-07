using BlockService.Common;
using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.Models.BlockImage;
using BlockService.Models.Permission;
using BlockService.Services.Exceptions;
using BlockService.Services.Interfaces;
using BlockService.Services.Mapper;
using Minio;
using Minio.DataModel.Args;

namespace BlockService.Services
{
    public class BlockImageService(
        IBlockImageRepository blockImageRepository,
        IBlockRepository blockRepository,
        IDocumentParticipantRepository documentParticipantRepository,
        IMinioClient minioClient
    ) : IBlockImageService
    {
        private string bucket = "images";
        private async Task ValidateWriteAccess(int documentId, int userId)
        {
            var roleInt = await documentParticipantRepository.GetUserRoleInDocument(userId, documentId);
            if (roleInt is null)
                throw new DocumentParticipantNotFoundException(userId, documentId);

            var role = (DocumentRole)roleInt;
            if (role != DocumentRole.Creator && role != DocumentRole.Editor)
                throw new PermissionDeniedException("Недостаточно прав для редактирования документа");
        }

        public async Task<BlockImage> SendBlockImage(SendBlockImageRequest request, FileUpload file)
        {
            Console.WriteLine("➡️ Вызван метод SendBlockImage (Service)");

            if (!await blockRepository.IsBlockExists(request.BlockId))
            {
                Console.WriteLine($"❌ Блок с ID {request.BlockId} не существует");
                throw new BlockNotFoundException(request.BlockId);
            }

            var block = await blockRepository.GetBlockById(request.BlockId);
            Console.WriteLine($"🔹 Проверка участника документа: userId = {request.UserId}, documentId = {block.DocumentId}");

            if (!await documentParticipantRepository.IsDocumentParticipantExists(request.UserId, block.DocumentId))
            {
                Console.WriteLine($"❌ Пользователь {request.UserId} не является участником документа {block.DocumentId}");
                throw new DocumentParticipantNotFoundException(request.UserId, block.DocumentId);
            }

            await ValidateWriteAccess(block.DocumentId, request.UserId);
            Console.WriteLine("✅ Проверка прав доступа пройдена");

            var objectName = GetObjectName(block.DocumentId, block.Id, request.UserId, file.FileName);

            Console.WriteLine($"🔹 Имя бакета: {bucket}, objectName: {objectName}");

            bool found = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucket));
            if (!found)
            {
                Console.WriteLine("📦 Бакет не найден, создаём...");
                await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucket));
            }
            else
            {
                Console.WriteLine("📦 Бакет найден");
            }

            var bytes = Convert.FromBase64String(file.ContentBase64);

            using (var stream = new MemoryStream(bytes))
            {
                Console.WriteLine($"⬆️ Загружаем объект в MinIO, размер: {stream.Length} байт, тип: {file.ContentType}");
                await minioClient.PutObjectAsync(new PutObjectArgs()
                    .WithBucket(bucket)
                    .WithObject(objectName)
                    .WithStreamData(stream)
                    .WithObjectSize(stream.Length)
                    .WithContentType(file.ContentType));
            }

            request.Url = $"{bucket}/{objectName}";
            request.UploadedOn = DateTime.UtcNow;

            Console.WriteLine($"✅ Файл загружен: {request.Url}");

            var dbBlockImage = request.MapToDb();
            dbBlockImage.Id = await blockImageRepository.CreateBlockImage(dbBlockImage);

            Console.WriteLine($"📝 Запись добавлена в БД с Id: {dbBlockImage.Id}");

            return dbBlockImage.MapToDomain();
        }


        public async Task DeleteBlockImage(int id, int userId)
        {
            Console.WriteLine("сервис удаления");
            var dbBlockImage = await blockImageRepository.GetImageById(id);
            if (dbBlockImage == null)
                throw new BlockImageNotFoundException(id);

            var block = await blockRepository.GetBlockById(dbBlockImage.BlockId);

            if (!await documentParticipantRepository.IsDocumentParticipantExists(userId, block.DocumentId))
                throw new DocumentParticipantNotFoundException(userId, block.DocumentId);

            await ValidateWriteAccess(block.DocumentId, userId);

            // Удаление из минио
            var firstSlashIndex = dbBlockImage.Url.IndexOf('/');
            Console.WriteLine("firstSlashIndex - " + firstSlashIndex);
            if (firstSlashIndex > 0 && firstSlashIndex < dbBlockImage.Url.Length - 1)
            {
                string bucket = dbBlockImage.Url[..firstSlashIndex];
                Console.WriteLine("bucket - " + bucket);
                string objectName = dbBlockImage.Url[(firstSlashIndex + 1)..];
                Console.WriteLine("objectName - " + objectName);

                await minioClient.RemoveObjectAsync(
                    new RemoveObjectArgs()
                        .WithBucket(bucket)
                        .WithObject(objectName));
            }

            await blockImageRepository.DeleteImage(id);
        }

        public async Task<List<BlockImage>> GetBlockImagesByBlock(int userId, int blockId)
        {
            var block = await blockRepository.GetBlockById(blockId);
            if (block == null)
            {
                throw new BlockNotFoundException(blockId);
            }

            if (!await documentParticipantRepository.IsDocumentParticipantExists(userId, block.DocumentId))
            {
                throw new DocumentParticipantNotFoundException(userId, block.DocumentId);
            }

            var dbBlockImages = await blockImageRepository.GetImagesByBlockId(blockId);

            return dbBlockImages.MapToDomain();
        }

        private string GetObjectName(int documentId, int blockId, int userId, string originalFileName)
        {
            var extension = Path.GetExtension(originalFileName);
            var fileNameWithoutExt = Path.GetFileNameWithoutExtension(originalFileName);

            var uniqueString = fileNameWithoutExt + DateTime.UtcNow.Ticks;
            var hashedFileName = Hash.GetHash(uniqueString);

            return $"documents/{documentId}/blocks/{blockId}/users/{userId}/{hashedFileName}{extension}";
        }
    }
}
