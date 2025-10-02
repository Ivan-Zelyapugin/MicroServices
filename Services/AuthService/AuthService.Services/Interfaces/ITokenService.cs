using AuthService.Models;
using System.Security.Claims;

namespace AuthService.Services.Interfaces
{
    public interface ITokenService
    {
        string CreateAccessToken(IEnumerable<Claim> claims);
        Task<AuthResponse> RefreshToken(string refreshToken);
    }
}
