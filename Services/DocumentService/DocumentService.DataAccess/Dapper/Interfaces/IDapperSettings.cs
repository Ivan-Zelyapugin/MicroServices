using DocumentService.DataAccess.Dapper.Models;

namespace DocumentService.DataAccess.Dapper.Interfaces
{
    public interface IDapperSettings
    {
        string ConnectionString { get; }

        Provider Provider { get; }
    }
}
