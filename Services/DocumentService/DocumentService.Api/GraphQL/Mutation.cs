using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;

namespace DocumentService.Api.GraphQL
{
    public class Mutation
    {
        private readonly IDocumentService _documentService;

        public Mutation(IDocumentService documentService)
        {
            _documentService = documentService;
        }

        public async Task<Document> CreateDocument(string name, int creatorId)
        {
            var request = new CreateDocumentRequest
            {
                CreatorId = creatorId,
                Name = name,
                UserIds = new List<int>()
            };

            return await _documentService.CreateDocument(request);
        }

        public async Task<bool> RenameDocument(int id, string newName, int userId)
        {
            await _documentService.RenameDocument(id, newName, userId);
            return true;
        }

        public async Task<bool> DeleteDocument(int id, int userId)
        {
            await _documentService.DeleteDocument(id, userId);
            return true;
        }
    }
}
