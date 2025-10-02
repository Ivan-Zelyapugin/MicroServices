using DocumentService.Models.Document;

namespace DocumentService.Services.Interfaces
{
    public interface IDocumentService
    {
        Task<Document> CreateDocument(CreateDocumentRequest request);
        Task DeleteDocument(int documentId, int requestingUserId);
        Task<List<UserDocumentDto>> GetDocumentsByUserId(int userId);
        Task<DocumentDetails> GetDocumentDetails(int id);
        Task AddUsersToDocument(AddUsersToDocumentRequest request);
        Task RenameDocument(int documentId, string newName, int requestingUserId);

    }
}
