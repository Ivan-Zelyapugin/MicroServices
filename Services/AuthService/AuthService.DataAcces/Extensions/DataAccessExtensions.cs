using AuthService.DataAcces.Dapper;
using AuthService.DataAcces.Dapper.Interfaces;
using AuthService.DataAcces.Models.Settings;
using AuthService.DataAcces.Repositories;
using AuthService.DataAcces.Repositories.Interfaces;
using DbUp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace AuthService.DataAcces.Extensions
{
    public static class DataAccessExtensions
    {
        public static IServiceCollection MigrateDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetSection("AuthServiceDatabase")["ConnectionString"];
            Console.WriteLine("ConnectionString => " + configuration["AuthServiceDatabase:ConnectionString"]);
            Console.WriteLine(connectionString);

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
                .AddSingleton<IDapperSettings, AuthServiceDatabase>()
                .AddSingleton<IDapperContext<IDapperSettings>, DapperContext<IDapperSettings>>();
        }
        public static IServiceCollection AddRepositories(this IServiceCollection services)
        {
            return services
                .AddScoped<IUserRepository, UserRepository>();
        }
    }
}
