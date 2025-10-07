using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Dapper.Models;
using BlockService.DataAccess.Models;
using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.DataAccess.Repositories.Scripts;

namespace BlockService.DataAccess.Repositories
{
    public class DocumentParticipantRepository(IDapperContext<IDapperSettings> dapperContext) : IDocumentParticipantRepository
    {
        public async Task<bool> IsDocumentParticipantExists(int userId, int documentId)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsDocumentParticipantExists, new { userId, documentId }));
        }

        public async Task<int?> GetUserRoleInDocument(int userId, int documentId)
        {
            return await dapperContext.FirstOrDefault<int?>(
                new QueryObject(Sql.GetUserRoleInDocument, new { userId, documentId })
            );
        }

        public async Task<List<DbDocumentParticipant>> GetDocumentParticipantsByUserId(int userId)
        {
            return await dapperContext.ListOrEmpty<DbDocumentParticipant>(new QueryObject(Sql.GetDocumentParticipantsByUserId, new { userId }));
        }
    }
}
