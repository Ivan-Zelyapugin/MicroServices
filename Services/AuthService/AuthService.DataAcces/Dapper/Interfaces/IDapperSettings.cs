using AuthService.DataAcces.Dapper.Models;

namespace AuthService.DataAcces.Dapper.Interfaces
{
    public interface IDapperSettings
    {
        string ConnectionString { get; }

        Provider Provider { get; }
    }
}
