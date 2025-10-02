using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Dapper.Models;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.DataAccess.Repositories.Scripts;

namespace DocumentService.DataAccess.Repositories
{
    public class UserRepository(IDapperContext<IDapperSettings> dapperContext) : IUserRepository
    {
        public async Task<bool> IsUserExistsById(int id)
        {
            return await dapperContext.FirstOrDefault<bool>(new QueryObject(Sql.IsUserExistsById, new { id }));
        }

        public async Task<int> CreateUser(DbUser user)
        {
            return await dapperContext.CommandWithResponse<int>(new QueryObject(Sql.CreateUser, user));
        }

        public async Task<List<DbUser>> GetUsersByEmailsAsync(IEnumerable<string> emails)
        {
            return await dapperContext.ListOrEmpty<DbUser>(
                new QueryObject(Sql.GetUsersByEmails, new { Emails = emails.ToArray() })
            );
        }
    }
}
