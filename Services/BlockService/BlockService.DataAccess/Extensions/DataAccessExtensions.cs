using BlockService.DataAccess.Dapper;
using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Models.Settings;
using BlockService.DataAccess.Repositories;
using BlockService.DataAccess.Repositories.Interfaces;
using DbUp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace BlockService.DataAccess.Extensions
{
    public static class DataAccessExtensions
    {
        public static IServiceCollection MigrateDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetSection("BlockDatabase")["ConnectionString"];

            EnsureDatabase.For.PostgresqlDatabase(connectionString);

            var upgrader = DeployChanges.To
                .PostgresqlDatabase(connectionString)
                .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
                .WithTransaction()
                .WithVariablesDisabled()
                .LogToConsole()
                .Build();

            if (upgrader.IsUpgradeRequired())
            {
                upgrader.PerformUpgrade();
            }

            return services;
        }
        public static IServiceCollection AddDapper(this IServiceCollection services)
        {
            return services
                .AddSingleton<IDapperSettings, BlockDatabase>()
                .AddSingleton<IDapperContext<IDapperSettings>, DapperContext<IDapperSettings>>();
        }
        public static IServiceCollection AddRepositories(this IServiceCollection services)
        {
            return services
                .AddScoped<IBlockRepository, BlockRepository>()
                .AddScoped<IBlockImageRepository, BlockImageRepository>()
                .AddScoped<IDocumentParticipantRepository, DocumentParticipantRepository>()
                .AddScoped<IDocumentRepository, DocumentRepository>();
        }
    }
}
