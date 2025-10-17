using Database;
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddEnvironmentVariables()
    .Build();

try
{
    DatabaseMigrator.Migrate(configuration);
    Console.WriteLine("Database migration completed successfully.");
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Migration failed: {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}
