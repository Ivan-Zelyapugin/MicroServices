using DbUp;
using DocumentService.DataAccess.Dapper;
using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models.Settings;
using DocumentService.DataAccess.Repositories;
using DocumentService.DataAccess.Repositories.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace DocumentService.DataAccess.Extensions
{
    public static class DataAccessExtensions
    {
        public static IServiceCollection MigrateDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetSection("DocumentServiceDatabase")["ConnectionString"];

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
                .AddSingleton<IDapperSettings, DocumentServiceDatabase>()
                .AddSingleton<IDapperContext<IDapperSettings>, DapperContext<IDapperSettings>>();
        }
        public static IServiceCollection AddRepositories(this IServiceCollection services)
        {
            return services
                .AddScoped<IDocumentRepository, DocumentRepository>()
                .AddScoped<IUserRepository, UserRepository>()
                .AddScoped<IDocumentParticipantRepository, DocumentParticipantRepository>();
        }
    }
}
