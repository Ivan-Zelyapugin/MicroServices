using DocumentService.Services.Models;

namespace DocumentService.Services.Interfaces
{
    public interface IVoiceSessionManager
    {
        IReadOnlyCollection<VoiceParticipant> GetParticipants(int documentId);
        IReadOnlyCollection<string> GetConnectionIds(int documentId);
        void AddOrUpdateParticipant(int documentId, VoiceParticipant participant);
        VoiceParticipant? RemoveConnection(int documentId, string connectionId);
        IReadOnlyCollection<int> RemoveConnectionFromAll(string connectionId);
        bool SetMuted(int documentId, string connectionId, bool isMuted, out VoiceParticipant? participant);
        bool SetScreenSharing(int documentId, string connectionId, bool isScreenSharing, out VoiceParticipant? participant);
    }
}
