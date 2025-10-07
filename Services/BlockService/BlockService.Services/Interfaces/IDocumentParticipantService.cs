using BlockService.Models.Permission;

namespace BlockService.Services.Interfaces
{
    public interface IDocumentParticipantService
    {
        Task<List<DocumentParticipant>> GetDocumentParticipantsByUserId(int userId);
    }
}
