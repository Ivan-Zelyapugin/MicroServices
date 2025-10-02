using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Models.Permission;
using DocumentService.Services.Exceptions;
using DocumentService.Services.Interfaces;
using DocumentService.Services.Mappers;

namespace DocumentService.Services
{
    public class DocumentService(
        IDocumentRepository documentRepository,
        IUserRepository userRepository,
        IDocumentParticipantRepository documentParticipantRepository
        ) : IDocumentService
    {
        public async Task<Document> CreateDocument(CreateDocumentRequest request)
        {
            request.UserIds.Add(request.CreatorId);
            foreach (var id in request.UserIds)
            {
                if (!await userRepository.IsUserExistsById(id))
                {
                    throw new UserNotFoundException(id);
                }
            }

            using var transaction = documentRepository.BeginTransaction();
            try
            {
                var dbDocument = request.MapToDb();
                var documentId = await documentRepository.CreateDocument(request.MapToDb(), transaction);


                var documentParticipants = new List<DbDocumentParticipant>();

                for (int i = 0; i < request.UserIds.Count; i++)
                {
                    var userId = request.UserIds[i];
                    var roleStr = request.Roles != null && i < request.Roles.Count ? request.Roles[i] : "User";

                    var parsed = Enum.TryParse<DocumentRole>(roleStr, true, out var role);
                    var roleEnum = parsed ? role : DocumentRole.User;

                    if (userId == request.CreatorId)
                        roleEnum = DocumentRole.Creator;

                    documentParticipants.Add(new DbDocumentParticipant
                    {
                        UserId = userId,
                        DocumentId = documentId,
                        Role = (int)roleEnum
                    });
                }




                await documentParticipantRepository.CreateDocumentParticipants(documentParticipants, transaction);
                transaction.Commit();

                dbDocument.Id = documentId;
                return dbDocument.MapToDomain();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task DeleteDocument(int documentId, int requestingUserId)
        {
            if (!await documentRepository.IsDocumentExists(documentId))
            {
                throw new DocumentNotFoundException(documentId);
            }

            var participant = await documentParticipantRepository.IsDocumentParticipantExists(requestingUserId, documentId);
            if (!participant)
            {
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);
            }

            var roleInt = await documentParticipantRepository.GetUserRoleInDocument(requestingUserId, documentId);
            if (roleInt is null)
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);

            var role = (DocumentRole)roleInt;
            if (role != DocumentRole.Creator)
                throw new PermissionDeniedException("Удаление документа разрешено только его создателю.");


            using var transaction = documentRepository.BeginTransaction();
            try
            {
                await documentRepository.DeleteDocument(documentId, transaction);
                transaction.Commit();
            }
            catch (Exception)
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<List<UserDocumentDto>> GetDocumentsByUserId(int userId)
        {
            var dbDocuments = await documentRepository.GetDocumentsByUserId(userId);
            var result = new List<UserDocumentDto>();


            foreach (var dbDoc in dbDocuments)
            {
                var roleInt = await documentParticipantRepository.GetUserRoleInDocument(userId, dbDoc.Id);
                if (roleInt == null)
                    continue;

                var role = (DocumentRole)roleInt;
                result.Add(new UserDocumentDto
                {
                    Document = dbDoc.MapToDomain(),
                    Role = role
                });
            }

            return result;
        }

        public async Task<DocumentDetails> GetDocumentDetails(int id)
        {
            var documentDetails = await documentRepository.GetDocumentDetails(id);

            if (documentDetails == null)
            {
                throw new DocumentNotFoundException(id);
            }

            return documentDetails;
        }

        public async Task AddUsersToDocument(AddUsersToDocumentRequest request)
        {
            if (!await documentRepository.IsDocumentExists(request.DocumentId))
                throw new DocumentNotFoundException(request.DocumentId);

            if (!await documentParticipantRepository.IsDocumentParticipantExists(request.RequestingUserId, request.DocumentId))
                throw new DocumentParticipantNotFoundException(request.RequestingUserId, request.DocumentId);

            var participants = new List<DbDocumentParticipant>();

            for (int i = 0; i < request.UserIds.Count; i++)
            {
                var userId = request.UserIds[i];
                if (!await userRepository.IsUserExistsById(userId))
                    throw new UserNotFoundException(userId);

                if (await documentParticipantRepository.IsDocumentParticipantExists(userId, request.DocumentId))
                    throw new UserAlreadyInDocumentException(userId, request.DocumentId);

                string roleStr = request.Roles != null && i < request.Roles.Count ? request.Roles[i] : "User";
                var parsed = Enum.TryParse<DocumentRole>(roleStr, true, out var role);
                var roleEnum = parsed ? role : DocumentRole.User;

                participants.Add(new DbDocumentParticipant
                {
                    DocumentId = request.DocumentId,
                    UserId = userId,
                    Role = (int)roleEnum
                });
            }

            await documentParticipantRepository.CreateDocumentParticipants(participants);
        }

        public async Task RenameDocument(int documentId, string newName, int requestingUserId)
        {
            if (!await documentRepository.IsDocumentExists(documentId))
                throw new DocumentNotFoundException(documentId);

            var participantExists = await documentParticipantRepository.IsDocumentParticipantExists(requestingUserId, documentId);
            if (!participantExists)
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);

            var roleInt = await documentParticipantRepository.GetUserRoleInDocument(requestingUserId, documentId);
            if (roleInt is null)
                throw new DocumentParticipantNotFoundException(requestingUserId, documentId);

            var role = (DocumentRole)roleInt;

            if (role != DocumentRole.Creator && role != DocumentRole.Editor)
                throw new PermissionDeniedException("Смена имени документа разрешена только создателю или редактору.");

            using var transaction = documentRepository.BeginTransaction();
            try
            {
                await documentRepository.UpdateDocumentName(documentId, newName, transaction);
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
