using DocumentService.DataAccess.Models;

namespace DocumentService.DataAccess.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> IsUserExistsById(int id);
        Task<int> CreateUser(DbUser user);
        Task<List<DbUser>> GetUsersByUsernamesAsync(IEnumerable<string> usernames);
    }
}
