using DocumentService.DataAccess.Dapper;
using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models.Settings;
using DocumentService.DataAccess.Repositories;
using DocumentService.DataAccess.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentService.DataAccess.Extensions
{
    public static class DataAccessExtensions
    {
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
