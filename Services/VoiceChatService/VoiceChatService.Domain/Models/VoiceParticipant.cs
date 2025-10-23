using VoiceChatService.Domain.Models.Enums;

namespace VoiceChatService.Domain.Models
{
    public class VoiceParticipant
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;

        public bool IsMuted { get; set; }
        public bool IsCameraOn { get; set; }
        public bool IsScreenSharing { get; set; }

        public VoiceRole Role { get; set; } = VoiceRole.Participant;

        // ConnectionId нужен для SignalR
        public string ConnectionId { get; set; } = string.Empty;

        // Текущие медиа состояния
        public MediaState AudioState { get; set; } = MediaState.Active;
        public MediaState VideoState { get; set; } = MediaState.Inactive;
    }
}
