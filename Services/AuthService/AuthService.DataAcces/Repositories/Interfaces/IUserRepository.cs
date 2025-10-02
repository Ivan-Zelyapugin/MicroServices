using AuthService.DataAcces.Dapper.Interfaces;
using AuthService.DataAcces.Models;

namespace AuthService.DataAcces.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> IsUserExistsByUsername(string username);
        Task<bool> IsUserExistsByEmail(string email);
        Task<int> CreateUser(DbUser user);
        Task<DbUser> GetUserByLogin(string login);
        Task<DbUser> GetUserById(int id);
        Task ConfirmEmail(string email);
        Task<DbUser> GetUserByRefreshToken(string refreshToken);
        Task UpdateRefreshToken(int id, string? refreshToken, DateTime? refreshTokenExpiredAfter);
    }
}
