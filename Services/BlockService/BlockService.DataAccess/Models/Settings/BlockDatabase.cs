using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Dapper.Models;
using Microsoft.Extensions.Configuration;

namespace BlockService.DataAccess.Models.Settings
{
    public class BlockDatabase(IConfiguration configuration) : IDapperSettings
    {
        public string ConnectionString => configuration.GetSection("BlockDatabase")["ConnectionString"];
        public Provider Provider => Enum.Parse<Provider>(configuration.GetSection("BlockDatabase")["Provider"]);
    }
}
