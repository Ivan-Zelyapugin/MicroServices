using DocumentService.DataAccess.Models;
using DocumentService.Models.Document;

namespace DocumentService.Services.Mappers
{
    public static class DocumentMapper
    {
        public static DbDocument MapToDb(this CreateDocumentRequest source)
        {
            return source == null
                ? default
                : new DbDocument
                {
                    Name = source.Name,
                    CreatorId = source.CreatorId
                };
        }

        public static Document MapToDomain(this DbDocument source)
        {
            return source == null
            ? default
                : new Document
                {
                    Id = source.Id,
                    Name = source.Name,
                    CreatorId = source.CreatorId
                };
        }

        public static List<Document> MapToDomain(this List<DbDocument> source)
        {
            return source == null ? [] : source.Select(x => x.MapToDomain()).ToList();
        }
    }
}
