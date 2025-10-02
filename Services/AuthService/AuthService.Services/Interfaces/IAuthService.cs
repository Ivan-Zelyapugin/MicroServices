using AuthService.Models;

namespace AuthService.Services.Interfaces
{
    public interface IAuthService
    {
        Task<int> Register(RegisterModel registerModel);
        Task<AuthResponse> Login(LoginModel loginModel);
        Task Logout(int userId);
        Task<AuthResponse> ConfirmEmail(int userId, string code);
    }
}
