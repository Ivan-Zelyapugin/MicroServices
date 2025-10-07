using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Models;

namespace BlockService.DataAccess.Repositories.Interfaces
{
    public interface IBlockImageRepository
    {
        ITransaction BeginTransaction();
        Task<int> CreateBlockImage(DbBlockImage blockImage);
        Task<List<DbBlockImage>> GetImagesByBlockId(int blockId);
        Task<DbBlockImage> GetImageById(int id);
        Task<bool> IsImageExists(int id);
        Task DeleteImage(int id);
    }
}
