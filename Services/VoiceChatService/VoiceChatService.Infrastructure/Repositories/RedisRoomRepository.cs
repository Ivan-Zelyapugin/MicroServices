using StackExchange.Redis;
using System.Text.Json;
using VoiceChatService.Domain.Models;
using VoiceChatService.Infrastructure.Configuration;
using VoiceChatService.Infrastructure.Dtos;
using VoiceChatService.Infrastructure.Mappers;
using VoiceChatService.Infrastructure.Redis;
using VoiceChatService.Infrastructure.Repositories.Interfaces;

namespace VoiceChatService.Infrastructure.Repositories
{
    public class RedisRoomRepository : IRoomRepository
    {
        private readonly IRedisConnectionFactory _factory;
        private readonly RedisSettings _settings;
        private readonly JsonSerializerOptions _jsonOptions;
        private const string RoomsSetKeySuffix = "rooms"; 

        public RedisRoomRepository(IRedisConnectionFactory factory, RedisSettings settings)
        {
            _factory = factory;
            _settings = settings;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };
        }

        private IDatabase Db => _factory.GetDatabase();

        private string KeyFor(int documentId) => $"{_settings.KeyPrefix}:room:{documentId}";
        private string RoomsSetKey => $"{_settings.KeyPrefix}:{RoomsSetKeySuffix}";

        public async Task<VoiceRoom?> GetRoomAsync(int documentId)
        {
            var key = KeyFor(documentId);
            var val = await Db.StringGetAsync(key).ConfigureAwait(false);
            if (!val.HasValue) return null;

            var dto = JsonSerializer.Deserialize<RoomStateDto>(val!, _jsonOptions);
            return dto == null ? null : VoiceRoomMapper.ToDomain(dto);
        }

        public async Task SaveRoomAsync(VoiceRoom room)
        {
            var key = KeyFor(room.DocumentId);
            var dto = VoiceRoomMapper.ToDto(room);
            var json = JsonSerializer.Serialize(dto, _jsonOptions);

            if (_settings.DefaultRoomTtlSeconds.HasValue && _settings.DefaultRoomTtlSeconds > 0)
            {
                await Db.StringSetAsync(key, json, TimeSpan.FromSeconds(_settings.DefaultRoomTtlSeconds.Value)).ConfigureAwait(false);
            }
            else
            {
                await Db.StringSetAsync(key, json).ConfigureAwait(false);
            }

            await Db.SetAddAsync(RoomsSetKey, room.DocumentId).ConfigureAwait(false);
        }

        public async Task DeleteRoomAsync(int documentId)
        {
            var key = KeyFor(documentId);
            await Db.KeyDeleteAsync(key).ConfigureAwait(false);
            await Db.SetRemoveAsync(RoomsSetKey, documentId).ConfigureAwait(false);
        }

        public async Task AddOrUpdateParticipantAsync(int documentId, VoiceParticipant participant)
        {
            var room = await GetRoomAsync(documentId).ConfigureAwait(false);
            if (room == null)
            {
                room = new VoiceRoom { DocumentId = documentId };
            }

            room.Participants[participant.UserId] = participant;

            await SaveRoomAsync(room).ConfigureAwait(false);
        }

        public async Task RemoveParticipantAsync(int documentId, int userId)
        {
            var room = await GetRoomAsync(documentId).ConfigureAwait(false);
            if (room == null) return;

            if (room.Participants.Remove(userId))
            {
                if (!room.Participants.Any())
                {
                    await DeleteRoomAsync(documentId).ConfigureAwait(false);
                }
                else
                {
                    await SaveRoomAsync(room).ConfigureAwait(false);
                }
            }
        }

        public async Task<VoiceParticipant?> GetParticipantAsync(int documentId, int userId)
        {
            var room = await GetRoomAsync(documentId).ConfigureAwait(false);
            if (room == null) return null;
            return room.Participants.TryGetValue(userId, out var p) ? p : null;
        }

        public async Task<IReadOnlyCollection<VoiceRoom>> GetAllRoomsAsync()
        {
            var ids = await Db.SetMembersAsync(RoomsSetKey).ConfigureAwait(false);
            var result = new List<VoiceRoom>();
            foreach (var idVal in ids)
            {
                if (!int.TryParse(idVal, out var docId)) continue;
                var room = await GetRoomAsync(docId).ConfigureAwait(false);
                if (room != null) result.Add(room);
            }
            return result;
        }
    }
}
