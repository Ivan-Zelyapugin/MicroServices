using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Dapper.Models;
using Microsoft.Extensions.Configuration;

namespace DocumentService.DataAccess.Models.Settings
{
    public class DocumentServiceDatabase(IConfiguration configuration) : IDapperSettings
    {
        public string ConnectionString => configuration.GetSection("DocumentServiceDatabase")["ConnectionString"];
        public Provider Provider => Enum.Parse<Provider>(configuration.GetSection("DocumentServiceDatabase")["Provider"]);
    }
}
