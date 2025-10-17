using AuthService.DataAcces.Dapper;
using AuthService.DataAcces.Dapper.Interfaces;
using AuthService.DataAcces.Models.Settings;
using AuthService.DataAcces.Repositories;
using AuthService.DataAcces.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.DataAcces.Extensions
{
    public static class DataAccessExtensions
    {
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
