using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Models;

namespace BlockService.DataAccess.Repositories.Interfaces
{
    public interface IBlockRepository
    {
        ITransaction BeginTransaction();
        Task<int> CreateBlock(DbBlock block);
        Task<List<DbBlock>> GetBlocksByDocument(int documentId, DateTime from);
        Task<DbBlock> GetBlockById(int id);
        Task<bool> IsBlockExists(int id);
        Task EditBlock(int id, string editedText, DateTime editedOn);
        Task DeleteBlock(int id);
    }
}
