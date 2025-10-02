using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Dapper.Models;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.DataAccess.Repositories.Scripts;
using DocumentService.Models.Document;
using DocumentService.Models.Permission;

namespace DocumentService.DataAccess.Repositories
{
    public class DocumentRepository(IDapperContext<IDapperSettings> dapperContext) : IDocumentRepository
    {
        public ITransaction BeginTransaction()
        {
            return dapperContext.BeginTransaction();
        }

        public async Task<int> CreateDocument(DbDocument document, ITransaction transaction = null)
        {
            return await dapperContext.CommandWithResponse<int>(new QueryObject(Sql.CreteDocument, document), transaction);
        }

        public async Task DeleteDocument(int id, ITransaction transaction = null)
        {
            await dapperContext.Command(new QueryObject(Sql.DeleteDocument, new { id }), transaction);
        }

        public async Task<bool> IsDocumentExists(int id)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsDocumentExists, new { id }));
        }

        public async Task<List<DbDocument>> GetDocumentsByUserId(int userId)
        {
            return await dapperContext.ListOrEmpty<DbDocument>(new QueryObject(Sql.GetDocumentsByUserId, new { userId }));
        }

        public async Task UpdateDocumentName(int documentId, string newName, ITransaction transaction = null)
        {
            var parameters = new { documentId, name = newName };
            await dapperContext.Command(new QueryObject(Sql.UpdateDocumentName, parameters), transaction);
        }

        public async Task<DocumentDetails> GetDocumentDetails(int id)
        {
            var document = await dapperContext.FirstOrDefault<DbDocument>(new QueryObject(Sql.GetDocumentById, new { id }));

            if (document == null)
            {
                return default;
            }

            var creatorTask = dapperContext.FirstOrDefault<DocumentParticipantFull>(new QueryObject(Sql.GetDocumentParticipantFull, new { userId = document.CreatorId, documentId = id }));
            var participantsTask = dapperContext.ListOrEmpty<DocumentParticipantFull>(new QueryObject(Sql.GetDocumentParticipantsFullByDocumentId, new { documentId = id }));

            await Task.WhenAll(creatorTask, participantsTask);

            return new DocumentDetails
            {
                Id = document.Id,
                Name = document.Name,
                Creator = creatorTask.Result,
                Participants = participantsTask.Result
                    .Where(p => p.UserId != document.CreatorId)
                    .ToList()
            };
        }
    }
}
