using AuthService.DataAcces.Dapper.Interfaces;
using AuthService.DataAcces.Dapper.Models;
using AuthService.DataAcces.Models;
using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.DataAcces.Repositories.Scripts;
using AuthService.Models;

namespace AuthService.DataAcces.Repositories
{
    public class UserRepository(IDapperContext<IDapperSettings> dapperContext) : IUserRepository
    {
        public async Task UpdateUser(UpdateUserRequest user)
        {
            await dapperContext.Command(new QueryObject(Sql.UpdateUser, user));
        }

        public async Task ChangePassword(int userId, string passwordHash)
        {
            await dapperContext.Command(new QueryObject(Sql.ChangePassword, new { userId, passwordHash }));
        }

        public async Task<bool> IsUserExistsByUsername(string username)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsUserExistsByUsername, new { username }));
        }

        public async Task<bool> IsUserExistsByEmail(string email)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsUserExistsByEmail, new { email }));
        }

        public async Task<DbUser> GetUserById(int id)
        {
            return await dapperContext.FirstOrDefault<DbUser>(new QueryObject(Sql.GetUserById, new { id }));
        }

        public async Task ConfirmEmail(string email)
        {
            await dapperContext.Command(new QueryObject(Sql.ConfirmEmail, new { email }));
        }

        public async Task<int> CreateUser(DbUser user)
        {
            return await dapperContext.CommandWithResponse<int>(new QueryObject(Sql.CreateUser, user));
        }

        public async Task<DbUser> GetUserByLogin(string login)
        {
            return await dapperContext.FirstOrDefault<DbUser>(new QueryObject(Sql.GetUserByLogin, new { login}));
        }

        public async Task<DbUser> GetUserByRefreshToken(string refreshToken)
        {
            return await dapperContext.FirstOrDefault<DbUser>(new QueryObject(Sql.GetUserByRefreshToken, new { refreshToken }));
        }

        public async Task UpdateRefreshToken(int id, string? refreshToken, DateTime? refreshTokenExpiredAfter)
        {
            await dapperContext.Command(new QueryObject(Sql.UpdateRefreshToken, new { id, refreshToken, refreshTokenExpiredAfter }));
        }
    }
}
