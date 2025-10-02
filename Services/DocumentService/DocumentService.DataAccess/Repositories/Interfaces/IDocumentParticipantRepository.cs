using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models;

namespace DocumentService.DataAccess.Repositories.Interfaces
{
    public interface IDocumentParticipantRepository
    {
        ITransaction BeginTransaction();
        Task CreateDocumentParticipant(DbDocumentParticipant DocumentParticipant, ITransaction transaction = null);
        Task CreateDocumentParticipants(List<DbDocumentParticipant> DocumentParticipants, ITransaction transaction = null);
        Task<bool> IsDocumentParticipantExists(int userId, int DocumentId);
        Task<List<DbDocumentParticipant>> GetDocumentParticipantsByUserId(int userId);
        Task<int?> GetUserRoleInDocument(int userId, int documentId);
        Task UpdateUserRoleInDocument(int userId, int documentId, int role, ITransaction transaction = null);
        Task DeleteDocumentParticipant(int userId, int documentId, ITransaction transaction = null);

    }
}
