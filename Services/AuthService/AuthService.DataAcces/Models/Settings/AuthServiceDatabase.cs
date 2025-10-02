using AuthService.DataAcces.Dapper.Interfaces;
using AuthService.DataAcces.Dapper.Models;
using Microsoft.Extensions.Configuration;

namespace AuthService.DataAcces.Models.Settings
{
    public class AuthServiceDatabase(IConfiguration configuration) : IDapperSettings
    {
        public string ConnectionString => configuration.GetSection("AuthServiceDatabase")["ConnectionString"];
        public Provider Provider => Enum.Parse<Provider>(configuration.GetSection("AuthServiceDatabase")["Provider"]);
    }
}
