using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;
using System.Linq;

namespace DocumentService.Api.GraphQL
{
    public class Query
    {
        private readonly IDocumentService _documentService;

        public Query(IDocumentService documentService)
        {
            _documentService = documentService;
        }

        public async Task<IEnumerable<UserDocumentDto>> GetMyDocuments(int userId)
        {
            return await _documentService.GetDocumentsByUserId(userId);
        }

        public async Task<DocumentInfoDto?> GetDocument(int id)
        {
            var details = await _documentService.GetDocumentDetails(id);
            if (details == null)
                return null;

            var result = new DocumentInfoDto
            {
                Id = details.Id,
                Name = details.Name,
                CreatorUsername = details.Creator?.Username,
                Users = details.Participants
                    .Select(p => new DocumentUserDto
                    {
                        UserId = p.UserId,
                        Username = p.Username,
                        Role = p.Role.ToString()
                    })
                    .ToList()
            };

            return result;
        }
    }
}
