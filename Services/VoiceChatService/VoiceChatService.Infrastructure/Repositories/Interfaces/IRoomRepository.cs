using VoiceChatService.Domain.Models;

namespace VoiceChatService.Infrastructure.Repositories.Interfaces
{
    public interface IRoomRepository
    {
        Task<VoiceRoom?> GetRoomAsync(int documentId);
        Task SaveRoomAsync(VoiceRoom room);
        Task DeleteRoomAsync(int documentId);

        Task AddOrUpdateParticipantAsync(int documentId, VoiceParticipant participant);
        Task RemoveParticipantAsync(int documentId, int userId);
        Task<VoiceParticipant?> GetParticipantAsync(int documentId, int userId);

        Task<IReadOnlyCollection<VoiceRoom>> GetAllRoomsAsync();
    }
}
