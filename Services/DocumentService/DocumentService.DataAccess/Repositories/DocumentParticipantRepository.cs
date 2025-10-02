using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Dapper.Models;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.DataAccess.Repositories.Scripts;

namespace DocumentService.DataAccess.Repositories
{
    public class DocumentParticipantRepository(IDapperContext<IDapperSettings> dapperContext) : IDocumentParticipantRepository
    {
        public ITransaction BeginTransaction()
        {
            return dapperContext.BeginTransaction();
        }

        public async Task CreateDocumentParticipant(DbDocumentParticipant documentParticipant, ITransaction transaction = null)
        {
            await dapperContext.Command(new QueryObject(Sql.CreateDocumentParticipant, documentParticipant), transaction);
        }

        public async Task CreateDocumentParticipants(List<DbDocumentParticipant> documentParticipants, ITransaction transaction = null)
        {
            await dapperContext.Command(new QueryObject(Sql.CreateDocumentParticipant, documentParticipants), transaction);
        }

        public async Task<bool> IsDocumentParticipantExists(int userId, int documentId)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsDocumentParticipantExists, new { userId, documentId }));
        }

        public async Task<List<DbDocumentParticipant>> GetDocumentParticipantsByUserId(int userId)
        {
            return await dapperContext.ListOrEmpty<DbDocumentParticipant>(new QueryObject(Sql.GetDocumentParticipantsByUserId, new { userId }));
        }

        public async Task<int?> GetUserRoleInDocument(int userId, int documentId)
        {
            return await dapperContext.FirstOrDefault<int?>(
                new QueryObject(Sql.GetUserRoleInDocument, new { userId, documentId })
            );
        }

        public async Task UpdateUserRoleInDocument(int documentId, int userId, int role, ITransaction transaction = null)
        {
            var parameters = new { userId, documentId, role };
            await dapperContext.Command(new QueryObject(Sql.UpdateUserRoleInDocument, parameters), transaction);
        }

        public async Task DeleteDocumentParticipant(int documentId, int userId, ITransaction transaction = null)
        {
            Console.WriteLine($"Remove for userId: {userId}, documentId: {documentId}");
            var parameters = new { userId, documentId };
            await dapperContext.Command(new QueryObject(Sql.DeleteDocumentParticipant, parameters), transaction);
            Console.WriteLine("Role changed successfully");
        }

    }
}
