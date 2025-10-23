using StackExchange.Redis;
using VoiceChatService.Infrastructure.Configuration;

namespace VoiceChatService.Infrastructure.Redis
{
    public class RedisConnectionFactory : IRedisConnectionFactory, IDisposable
    {
        private readonly string _connectionString;
        private readonly Lazy<ConnectionMultiplexer> _lazyConnection;

        public RedisConnectionFactory(RedisSettings settings)
        {
            _connectionString = settings.ConnectionString;

            _lazyConnection = new Lazy<ConnectionMultiplexer>(() =>
            {
                return ConnectionMultiplexer.Connect(_connectionString);
            });
        }

        public ConnectionMultiplexer GetConnection() => _lazyConnection.Value;
        public IDatabase GetDatabase() => GetConnection().GetDatabase();

        public void Dispose()
        {
            if (_lazyConnection.IsValueCreated)
                _lazyConnection.Value.Dispose();
        }
    }
}
