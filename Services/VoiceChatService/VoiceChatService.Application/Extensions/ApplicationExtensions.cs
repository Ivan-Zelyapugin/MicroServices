using Microsoft.Extensions.DependencyInjection;
using VoiceChatService.Application.Interfaces;

namespace VoiceChatService.Application.Extensions
{
    public static class ApplicationExtensions
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            // Регистрация сервисов приложения
            services.AddScoped<IVoiceChatService, VoiceChatService>();

            return services;
        }
    }
}
