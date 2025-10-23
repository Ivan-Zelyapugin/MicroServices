using VoiceChatService.Domain.Models;

namespace VoiceChatService.Application.Interfaces
{
    public interface IVoiceChatService
    {
        Task<VoiceRoom> JoinRoomAsync(int documentId, VoiceParticipant participant);
        Task LeaveRoomAsync(int documentId, int userId);
        Task MuteParticipantAsync(int documentId, int userId, bool mute);
        Task ToggleCameraAsync(int documentId, int userId, bool cameraOn);
        Task ToggleScreenShareAsync(int documentId, int userId, bool isSharing);
        Task<VoiceRoom?> GetRoomStateAsync(int documentId);
        Task<IReadOnlyCollection<VoiceRoom>> GetAllActiveRoomsAsync();
    }
}
