using VoiceChatService.Application.Interfaces;
using VoiceChatService.Domain.Models;
using VoiceChatService.Infrastructure.Repositories.Interfaces;

namespace VoiceChatService.Application
{
    public class VoiceChatService : IVoiceChatService
    {
        private readonly IRoomRepository _roomRepository;

        public VoiceChatService(IRoomRepository roomRepository)
        {
            _roomRepository = roomRepository;
        }

        public async Task<VoiceRoom> JoinRoomAsync(int documentId, VoiceParticipant participant)
        {
            await _roomRepository.AddOrUpdateParticipantAsync(documentId, participant);
            var room = await _roomRepository.GetRoomAsync(documentId);
            return room!;
        }

        public async Task LeaveRoomAsync(int documentId, int userId)
        {
            await _roomRepository.RemoveParticipantAsync(documentId, userId);
        }

        public async Task MuteParticipantAsync(int documentId, int userId, bool mute)
        {
            var participant = await _roomRepository.GetParticipantAsync(documentId, userId);
            if (participant == null) return;

            participant.IsMuted = mute;
            await _roomRepository.AddOrUpdateParticipantAsync(documentId, participant);
        }

        public async Task ToggleCameraAsync(int documentId, int userId, bool cameraOn)
        {
            var participant = await _roomRepository.GetParticipantAsync(documentId, userId);
            if (participant == null) return;

            participant.IsCameraOn = cameraOn;
            await _roomRepository.AddOrUpdateParticipantAsync(documentId, participant);
        }

        public async Task ToggleScreenShareAsync(int documentId, int userId, bool isSharing)
        {
            var participant = await _roomRepository.GetParticipantAsync(documentId, userId);
            if (participant == null) return;

            participant.IsScreenSharing = isSharing;
            await _roomRepository.AddOrUpdateParticipantAsync(documentId, participant);
        }

        public async Task<VoiceRoom?> GetRoomStateAsync(int documentId)
        {
            return await _roomRepository.GetRoomAsync(documentId);
        }

        public async Task<IReadOnlyCollection<VoiceRoom>> GetAllActiveRoomsAsync()
        {
            return await _roomRepository.GetAllRoomsAsync();
        }
    }
}
