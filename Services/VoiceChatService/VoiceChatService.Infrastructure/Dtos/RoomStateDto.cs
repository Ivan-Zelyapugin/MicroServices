namespace VoiceChatService.Infrastructure.Dtos
{
    public class RoomStateDto
    {
        public int DocumentId { get; set; }
        public Dictionary<int, ParticipantDto> Participants { get; set; } = new();
    }
}
