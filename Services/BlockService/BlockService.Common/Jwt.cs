using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace BlockService.Common
{
    public static class Jwt
    {
        public static string GetId(string token)
        {
            return ParseToken(token, "userId");
        }

        public static string GetRole(string token)
        {
            return ParseToken(token, "role");
        }

        public static string GetEmail(string token)
        {
            return ParseToken(token, "email");
        }

        public static string GetUsername(string token)
        {
            return ParseToken(token, "login");
        }

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

        private static string ParseToken(string token, string role)
        {
            if (token.Contains("Bearer "))
            {
                token = token.Split(' ')[1];
            }
            var handler = new JwtSecurityTokenHandler();
            var payload = handler.ReadJwtToken(token).Payload;

            return payload.Claims.FirstOrDefault(c => c.Type.Split('/').Last() == role)?.Value;
        }
    }
}
