using DocumentService.DataAccess.Models;
using DocumentService.Models;

namespace DocumentService.DataAccess.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> IsUserExistsById(int id);
        Task<int> CreateUser(DbUser user);
        Task<List<DbUser>> GetUsersByUsernamesAsync(IEnumerable<string> usernames);
        Task<User> GetMe(int id);
    }
}
