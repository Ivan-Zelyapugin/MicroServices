namespace VoiceChatService.Infrastructure.Configuration
{
    public class RedisSettings
    {
        public string Host { get; set; }
        public int Port { get; set; }
        public string KeyPrefix { get; set; }
        public int? DefaultRoomTtlSeconds { get; set; }

        public string ConnectionString => $"{Host}:{Port}";
    }
}
