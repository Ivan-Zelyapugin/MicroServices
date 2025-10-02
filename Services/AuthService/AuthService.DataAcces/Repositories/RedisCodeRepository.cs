using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.Models;
using StackExchange.Redis;
using System.Text.Json;

namespace AuthService.DataAcces.Repositories
{
    public class RedisCodeRepository : ICodeRepository
    {
        private readonly IDatabase _db;
        private readonly TimeSpan _ttl = TimeSpan.FromMinutes(10);

        public RedisCodeRepository(IConnectionMultiplexer redis)
        {
            _db = redis.GetDatabase();
        }

        public async Task SaveAsync(ConfirmationCode code)
        {
            var json = JsonSerializer.Serialize(code);
            await _db.StringSetAsync(code.Email, json, _ttl);
        }

        public async Task<ConfirmationCode?> GetAsync(string email)
        {
            var json = await _db.StringGetAsync(email);
            if (json.IsNullOrEmpty) return null;
            return JsonSerializer.Deserialize<ConfirmationCode>(json);
        }

        public async Task DeleteAsync(string email)
        {
            await _db.KeyDeleteAsync(email);
        }
    }
}
