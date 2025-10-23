namespace VoiceChatService.Domain.Models
{
    public class VoiceRoom
    {
        public int DocumentId { get; set; }
        public string RoomId => $"doc-{DocumentId}";

        public Dictionary<int, VoiceParticipant> Participants { get; set; } = new();

        public bool IsActive => Participants.Count > 0;
    }
}
