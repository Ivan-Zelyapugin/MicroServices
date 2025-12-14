using AuthService.DataAcces.Models;
using AuthService.Models;

namespace AuthService.Services.Interfaces
{
    public interface IUserService
    {
        Task<UserDto> GetUser(int id);
        Task UpdateUser(UpdateUserRequest request);
        Task ChangePassword(ChangePasswordRequest request);
    }
}
