using BlockService.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace BlockService.Services.Extensions
{
    public static class ServicesExtensions
    {
        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            return services
                .AddScoped<IBlockService, BlockService>()
                .AddScoped<IBlockImageService, BlockImageService>()
                .AddScoped<IDocumentParticipantService,  DocumentParticipantService>()
                .AddSingleton<IConnectionTracker, ConnectionTracker>();
        }
    }
}
