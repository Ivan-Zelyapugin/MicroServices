using StackExchange.Redis;

namespace VoiceChatService.Infrastructure.Redis
{
    public interface IRedisConnectionFactory
    {
        ConnectionMultiplexer GetConnection();
        IDatabase GetDatabase();
    }
}
