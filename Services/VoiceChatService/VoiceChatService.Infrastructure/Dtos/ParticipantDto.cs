namespace VoiceChatService.Infrastructure.Dtos
{
    public class ParticipantDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string ConnectionId { get; set; } = string.Empty;
        public bool IsMuted { get; set; }
        public bool IsCameraOn { get; set; }
        public bool IsScreenSharing { get; set; }
        public string Role { get; set; } = "Participant";
        public string AudioState { get; set; } = "Active";
        public string VideoState { get; set; } = "Inactive";
    }
}
