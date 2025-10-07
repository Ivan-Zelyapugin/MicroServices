using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.Models.Permission;
using BlockService.Services.Interfaces;
using BlockService.Services.Mapper;

namespace BlockService.Services
{
    public class DocumentParticipantService(IDocumentParticipantRepository documentParticipantRepository, IDocumentRepository documentRepository) : IDocumentParticipantService
    {
        public async Task<List<DocumentParticipant>> GetDocumentParticipantsByUserId(int userId)
        {
            var dbDocumentParticipants = await documentParticipantRepository.GetDocumentParticipantsByUserId(userId);

            return dbDocumentParticipants.MapToDomain();
        }
    }
}
