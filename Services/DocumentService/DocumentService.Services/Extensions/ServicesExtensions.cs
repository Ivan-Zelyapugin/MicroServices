using DocumentService.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace DocumentService.Services.Extensions
{
    public static class ServicesExtensions
    {
        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            return services
                .AddSingleton<IConnectionTracker, ConnectionTracker>()
                .AddScoped<IDocumentService, DocumentService>()
                .AddScoped<IDocumentParticipantService, DocumentParticipantService>();
        }
    }
}
