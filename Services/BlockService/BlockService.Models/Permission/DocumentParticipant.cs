namespace BlockService.Models.Permission
{
    public class DocumentParticipant
    {
        public int UserId { get; set; }
        public int DocumentId { get; set; }
        public DocumentRole Role { get; set; }
    }
}
