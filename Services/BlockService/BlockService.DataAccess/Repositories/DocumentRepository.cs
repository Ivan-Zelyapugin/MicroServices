using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Dapper.Models;
using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.DataAccess.Repositories.Scripts;

namespace BlockService.DataAccess.Repositories
{
    public class DocumentRepository(IDapperContext<IDapperSettings> dapperContext) : IDocumentRepository
    {
        public async Task<bool> IsDocumentExists(int id)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsDocumentExists, new { id }));
        }
    }
}
