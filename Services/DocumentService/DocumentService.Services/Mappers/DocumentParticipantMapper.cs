using DocumentService.DataAccess.Models;
using DocumentService.Models.Permission;

namespace DocumentService.Services.Mappers
{
    public static class DocumentParticipantMapper
    {
        public static DocumentParticipant MapToDomain(this DbDocumentParticipant source)
        {
            return source == null
                ? default
                : new DocumentParticipant
                {
                    UserId = source.UserId,
                    DocumentId = source.DocumentId,
                    Role = (DocumentRole)source.Role
                };
        }

        public static List<DocumentParticipant> MapToDomain(this List<DbDocumentParticipant> source)
        {
            return source == null ? [] : source.Select(x => x.MapToDomain()).ToList();
        }
    }
}
