using DbUp;
using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace Database
{
    public static class DatabaseMigrator
    {
        public static void Migrate(IConfiguration configuration)
        {
            var connectionString = configuration.GetSection("CollaboCraftDatabase")["ConnectionString"];

            EnsureDatabase.For.PostgresqlDatabase(connectionString);

            var upgrader = DeployChanges.To
                .PostgresqlDatabase(connectionString)
                .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
                .WithTransaction()
                .LogToConsole()
                .Build();

            if (upgrader.IsUpgradeRequired())
            {
                var result = upgrader.PerformUpgrade();
                if (!result.Successful)
                    throw new Exception(result.Error.Message);
            }
        }
    }
}
