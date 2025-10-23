using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VoiceChatService.Infrastructure.Configuration;
using VoiceChatService.Infrastructure.Redis;
using VoiceChatService.Infrastructure.Repositories;
using VoiceChatService.Infrastructure.Repositories.Interfaces;

namespace VoiceChatService.Infrastructure.Extensions
{
    public static class InfrastructureExtensions
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<RedisSettings>(configuration.GetSection("Redis"));

            services.AddSingleton(resolver =>
                resolver.GetRequiredService<IOptions<RedisSettings>>().Value);

            services.AddSingleton<IRedisConnectionFactory>(resolver =>
            {
                var settings = resolver.GetRequiredService<RedisSettings>();
                return new RedisConnectionFactory(settings);
            });

            services.AddSingleton<IRoomRepository, RedisRoomRepository>();

            return services;
        }
    }
}
