namespace DocumentService.Services.Models
{
    public class VoiceParticipant
    {
        public required string ConnectionId { get; init; }
        public required int UserId { get; init; }
        public required string Username { get; init; }
        public bool IsMuted { get; set; }
        public bool IsScreenSharing { get; set; }
    }
}
