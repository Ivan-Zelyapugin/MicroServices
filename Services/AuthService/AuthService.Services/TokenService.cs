using AuthService.Common;
using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.Models;
using AuthService.Models.Interfaces;
using AuthService.Services.Exceptions;
using AuthService.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AuthService.Services
{
    public class TokenService(IAuthSettings authSettings, IUserRepository userRepository) : ITokenService
    {
        public string CreateAccessToken(IEnumerable<Claim> claims)
        {
            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authSettings.Key));

            var token = new JwtSecurityToken(
                issuer: authSettings.Issuer,
                audience: authSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(authSettings.AccessTokenExpiresInMinutes),
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public static string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        public async Task<AuthResponse> RefreshToken(string refreshToken)
        {
            var user = await userRepository.GetUserByRefreshToken(refreshToken);
            if (user == null)
                throw new RefreshTokenNotFoundException();

            if (user.RefreshTokenExpiredAfter < DateTime.UtcNow)
                throw new SecurityTokenExpiredException("Refresh token expired");

            var claims = Jwt.GetClaims(user.Id, user.Role, user.Email, user.Username);
            var newAccessToken = CreateAccessToken(claims);

            string newRefreshToken = refreshToken; 
            var refreshThreshold = TimeSpan.FromDays(1); 

            if (user.RefreshTokenExpiredAfter - DateTime.UtcNow < refreshThreshold)
            {
                newRefreshToken = GenerateRefreshToken();
                await userRepository.UpdateRefreshToken(
                    user.Id,
                    newRefreshToken,
                    DateTime.UtcNow.AddDays(authSettings.RefreshTokenExpiresInDays)
                );
            }

            return new AuthResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken
            };
        }

    }
}
