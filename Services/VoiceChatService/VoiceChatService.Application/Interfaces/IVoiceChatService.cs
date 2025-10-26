using VoiceChatService.Domain.Models;
using VoiceChatService.Domain.Models.Enums;

namespace VoiceChatService.Application.Interfaces
{
    public interface IVoiceChatService
    {
        Task<VoiceRoom> JoinRoomAsync(int documentId, VoiceParticipant participant);
        Task LeaveRoomAsync(int documentId, int userId);
        Task<VoiceRoom?> GetRoomStateAsync(int documentId);
        Task<IReadOnlyCollection<VoiceRoom>> GetAllActiveRoomsAsync();

        Task MuteParticipantAsync(int documentId, int userId, bool mute);
        Task ToggleCameraAsync(int documentId, int userId, bool cameraOn);

        Task ToggleScreenShareAsync(int documentId, int userId, bool isSharing);
        Task SetAudioStateAsync(int documentId, int userId, MediaState state);
        Task SetVideoStateAsync(int documentId, int userId, MediaState state);
    }
}
