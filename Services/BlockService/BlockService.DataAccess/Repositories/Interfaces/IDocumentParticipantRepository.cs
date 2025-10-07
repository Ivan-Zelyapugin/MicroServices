using BlockService.DataAccess.Models;

namespace BlockService.DataAccess.Repositories.Interfaces
{
    public interface IDocumentParticipantRepository
    {
        Task<int?> GetUserRoleInDocument(int userId, int documentId);
        Task<bool> IsDocumentParticipantExists(int userId, int DocumentId);
        Task<List<DbDocumentParticipant>> GetDocumentParticipantsByUserId(int userId);
    }
}
