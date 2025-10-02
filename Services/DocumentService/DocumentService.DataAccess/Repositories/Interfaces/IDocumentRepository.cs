using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models;
using DocumentService.Models.Document;

namespace DocumentService.DataAccess.Repositories.Interfaces
{
    public interface IDocumentRepository
    {
        ITransaction BeginTransaction();
        Task<int> CreateDocument(DbDocument document, ITransaction transaction = null);
        Task DeleteDocument(int id, ITransaction transaction = null);
        Task<bool> IsDocumentExists(int id);
        Task<List<DbDocument>> GetDocumentsByUserId(int userId);
        Task<DocumentDetails> GetDocumentDetails(int id);
        Task UpdateDocumentName(int documentId, string newName, ITransaction transaction = null);
    }
}
