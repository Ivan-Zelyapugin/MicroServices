using VoiceChatService.Domain.Models;
using VoiceChatService.Domain.Models.Enums;
using VoiceChatService.Infrastructure.Dtos;

namespace VoiceChatService.Infrastructure.Mappers
{
    public static class VoiceRoomMapper
    {
        public static RoomStateDto ToDto(VoiceRoom room)
        {
            var dto = new RoomStateDto { DocumentId = room.DocumentId, Participants = new Dictionary<int, ParticipantDto>() };
            foreach (var kv in room.Participants)
            {
                var p = kv.Value;
                dto.Participants[kv.Key] = new ParticipantDto
                {
                    UserId = p.UserId,
                    Username = p.Username ?? string.Empty,
                    ConnectionId = p.ConnectionId ?? string.Empty,
                    IsMuted = p.IsMuted,
                    IsCameraOn = p.IsCameraOn,
                    IsScreenSharing = p.IsScreenSharing,
                    Role = p.Role.ToString(),
                    AudioState = p.AudioState.ToString(),
                    VideoState = p.VideoState.ToString()
                };
            }
            return dto;
        }

        public static VoiceRoom ToDomain(RoomStateDto dto)
        {
            var room = new VoiceRoom { DocumentId = dto.DocumentId };
            if (dto.Participants != null)
            {
                foreach (var kv in dto.Participants)
                {
                    var p = kv.Value;
                    var participant = new VoiceParticipant
                    {
                        UserId = p.UserId,
                        Username = p.Username ?? string.Empty,
                        ConnectionId = p.ConnectionId ?? string.Empty,
                        IsMuted = p.IsMuted,
                        IsCameraOn = p.IsCameraOn,
                        IsScreenSharing = p.IsScreenSharing,
                        Role = ParseEnumSafe(p.Role, VoiceRole.Participant),
                        AudioState = ParseEnumSafe(p.AudioState, MediaState.Active),
                        VideoState = ParseEnumSafe(p.VideoState, MediaState.Inactive)
                    };

                    room.Participants[participant.UserId] = participant;
                }
            }
            return room;
        }

        private static T ParseEnumSafe<T>(string? value, T defaultValue) where T : struct
        {
            if (string.IsNullOrWhiteSpace(value)) return defaultValue;
            if (Enum.TryParse<T>(value, true, out var r)) return r;
            return defaultValue;
        }
    }
}
