using BlockService.DataAccess.Repositories;
using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.Models.BlockText;
using BlockService.Models.Permission;
using BlockService.Services.Exceptions;
using BlockService.Services.Interfaces;
using BlockService.Services.Mapper;

namespace BlockService.Services
{
    public class BlockService(
        IBlockRepository blockRepository,
        IDocumentRepository documentRepository,
        IDocumentParticipantRepository documentParticipantRepository
        ) : IBlockService
    {
        private async Task ValidateWriteAccess(int documentId, int userId)
        {
            var roleInt = await documentParticipantRepository.GetUserRoleInDocument(userId, documentId);
            if (roleInt is null)
                throw new DocumentParticipantNotFoundException(userId, documentId);

            var role = (DocumentRole)roleInt;
            if (role != DocumentRole.Creator && role != DocumentRole.Editor)
                throw new PermissionDeniedException("Недостаточно прав для редактирования документа");
        }

        public async Task<Block> SendBlock(SendBlockRequest request)
        {
            if (!await documentRepository.IsDocumentExists(request.DocumentId))
            {
                throw new DocumentNotFoundException(request.DocumentId);
            }

            if (!await documentParticipantRepository.IsDocumentParticipantExists(request.UserId, request.DocumentId))
            {
                throw new DocumentParticipantNotFoundException(request.UserId, request.DocumentId);
            }

            await ValidateWriteAccess(request.DocumentId, request.UserId);

            request.SentOn = DateTime.UtcNow;
            var dbBlock = request.MapToDb();
            dbBlock.Id = await blockRepository.CreateBlock(dbBlock);

            return dbBlock.MapToDomain();
        }

        public async Task<List<Block>> GetBlocksByDocument(int userId, int documentId, DateTime from)
        {
            if (!await documentRepository.IsDocumentExists(documentId))
            {
                throw new DocumentNotFoundException(documentId);
            }

            if (!await documentParticipantRepository.IsDocumentParticipantExists(userId, documentId))
            {
                throw new DocumentParticipantNotFoundException(userId, documentId);
            }

            var dbBlocks = await blockRepository.GetBlocksByDocument(documentId, from);

            return dbBlocks.MapToDomain();
        }

        public async Task<Block> EditBlock(EditBlockRequest request)
        {
            var message = await blockRepository.GetBlockById(request.Id);

            if (message == null)
            {
                throw new BlockNotFoundException(request.Id);
            }

            if (message.UserId != request.UserId)
            {
                await ValidateWriteAccess(message.DocumentId, request.UserId);
            }

            request.EditedOn = DateTime.UtcNow;
            await blockRepository.EditBlock(request.Id, request.EditedText, request.EditedOn.Value);

            return request.MapToDomain(message.SentOn, message.DocumentId);
        }

        public async Task DeleteBlock(int blockId, int userId)
        {
            var block = await blockRepository.GetBlockById(blockId);
            if (block == null)
                throw new BlockNotFoundException(blockId);

            if (block.UserId != userId)
                await ValidateWriteAccess(block.DocumentId, userId);

            await blockRepository.DeleteBlock(blockId);
        }
    }
}
