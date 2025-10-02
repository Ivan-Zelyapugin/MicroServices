using AuthService.Models.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AuthService.Models
{
    public class AuthSettings(IConfiguration configuration) : IAuthSettings
    {
        public string Issuer => configuration.GetSection("Auth")["Issuer"];
        public string Audience => configuration.GetSection("Auth")["Audience"];
        public string Key => configuration.GetSection("Auth")["Key"];
        public int AccessTokenExpiresInMinutes => int.Parse(configuration.GetSection("Auth")["AccessTokenExpiresInMinutes"]);
        public int RefreshTokenExpiresInDays => int.Parse(configuration.GetSection("Auth")["RefreshTokenExpiresInDays"]);
    }
}
