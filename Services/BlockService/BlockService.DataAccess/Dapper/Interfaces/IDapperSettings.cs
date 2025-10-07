using BlockService.DataAccess.Dapper.Models;

namespace BlockService.DataAccess.Dapper.Interfaces
{
    public interface IDapperSettings
    {
        string ConnectionString { get; }

        Provider Provider { get; }
    }
}
