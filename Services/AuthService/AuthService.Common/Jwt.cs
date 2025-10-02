using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace AuthService.Common
{
    public static class Jwt
    {
        public static List<Claim> GetClaims(int id, int role, string email, string username)
        {
            return
            [
                new Claim("userId", id.ToString()),
                new Claim("role", role.ToString()),
                new Claim("email", email),
                new Claim("login", username)
            ];
        }
    }
}
