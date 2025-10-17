using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Database
{
    public static class DatabaseExtensions
    {
        public static IServiceCollection MigrateSharedDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            DatabaseMigrator.Migrate(configuration);
            return services;
        }
    }
}
