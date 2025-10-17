using BlockService.DataAccess.Dapper;
using BlockService.DataAccess.Dapper.Interfaces;
using BlockService.DataAccess.Models.Settings;
using BlockService.DataAccess.Repositories;
using BlockService.DataAccess.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace BlockService.DataAccess.Extensions
{
    public static class DataAccessExtensions
    {
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
