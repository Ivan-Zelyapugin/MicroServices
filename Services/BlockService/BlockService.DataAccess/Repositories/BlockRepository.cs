using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Dapper.Models;
using BlockService.DataAccess.Models;
using BlockService.DataAccess.Repositories.Interfaces;
using BlockService.DataAccess.Repositories.Scripts;

namespace BlockService.DataAccess.Repositories
{
    public class BlockRepository(IDapperContext<IDapperSettings> dapperContext) : IBlockRepository
    {
        public ITransaction BeginTransaction()
        {
            return dapperContext.BeginTransaction();
        }

        public async Task<int> CreateBlock(DbBlock block)
        {
            return await dapperContext.CommandWithResponse<int>(new QueryObject(Sql.CreateBlock, block));
        }

        public async Task<List<DbBlock>> GetBlocksByDocument(int documentId, DateTime from)
        {
            return await dapperContext.ListOrEmpty<DbBlock>(new QueryObject(Sql.GetBlockByDocument, new { documentId, from }));
        }

        public async Task<DbBlock> GetBlockById(int id)
        {
            return await dapperContext.FirstOrDefault<DbBlock>(new QueryObject(Sql.GetBlockById, new { id }));
        }

        public async Task<bool> IsBlockExists(int id)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsBlockExists, new { id }));
        }

        public async Task EditBlock(int id, string editedText, DateTime editedOn)
        {
            await dapperContext.Command(new QueryObject(Sql.EditBlock, new { id, editedText, editedOn }));
        }

        public async Task DeleteBlock(int id)
        {
            await dapperContext.Command( new QueryObject(Sql.DeleteBlock, new { id }));
        }
    }
}
