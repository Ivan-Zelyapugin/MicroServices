using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Permission;
using DocumentService.Services.Exceptions;
using DocumentService.Services.Interfaces;
using DocumentService.Services.Mappers;

namespace DocumentService.Services
{
    public class DocumentParticipantService(IDocumentParticipantRepository documentParticipantRepository, IDocumentRepository documentRepository) : IDocumentParticipantService
    {
        public async Task<List<DocumentParticipant>> GetDocumentParticipantsByUserId(int userId)
        {
            var dbDocumentParticipants = await documentParticipantRepository.GetDocumentParticipantsByUserId(userId);

            return dbDocumentParticipants.MapToDomain();
        }

        public async Task RemoveUserFromDocument(int documentId, int userId, int requestingUserId)
        {
            Console.WriteLine($"Remove for userId: {userId}, documentId: {documentId}");

            if (!await documentRepository.IsDocumentExists(documentId))
                throw new DocumentNotFoundException(documentId);

            var requestingUserRoleInt = await documentParticipantRepository.GetUserRoleInDocument(requestingUserId, documentId);
            if (requestingUserRoleInt is null)
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);

            var requestingUserRole = (DocumentRole)requestingUserRoleInt;
            if (requestingUserRole != DocumentRole.Creator)
                throw new PermissionDeniedException("Удаление пользователей доступно только создателю документа.");

            var participantExists = await documentParticipantRepository.IsDocumentParticipantExists(userId, documentId);
            if (!participantExists)
                throw new DocumentParticipantNotFoundException(userId, documentId);

            using var transaction = documentParticipantRepository.BeginTransaction();
            try
            {

                await documentParticipantRepository.DeleteDocumentParticipant(documentId, userId, transaction);
                transaction.Commit();
                Console.WriteLine("Remove successfully");
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task ChangeUserRoleInDocument(int documentId, int userId, string newRoleStr, int requestingUserId)
        {
            if (!await documentRepository.IsDocumentExists(documentId))
                throw new DocumentNotFoundException(documentId);

            var requestingUserRoleInt = await documentParticipantRepository.GetUserRoleInDocument(requestingUserId, documentId);
            if (requestingUserRoleInt is null)
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);

            var requestingUserRole = (DocumentRole)requestingUserRoleInt;

            if (requestingUserRole != DocumentRole.Creator)
                throw new PermissionDeniedException("Изменение ролей доступно только создателю документа.");

            var participantExists = await documentParticipantRepository.IsDocumentParticipantExists(userId, documentId);
            if (!participantExists)
                throw new DocumentParticipantNotFoundException(userId, documentId);

            if (!Enum.TryParse<DocumentRole>(newRoleStr, true, out var newRole))
                throw new ArgumentException("Неверное значение роли");

            using var transaction = documentParticipantRepository.BeginTransaction();

            var parsed = Enum.TryParse<DocumentRole>(newRoleStr, true, out var role);
            var roleEnum = parsed ? role : DocumentRole.User;
            try
            {
                await documentParticipantRepository.UpdateUserRoleInDocument(documentId, userId, (int)roleEnum, transaction);
                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }
}
