namespace DocumentService.DataAccess.Models
{
    public class DbDocumentParticipant
    {
        public int UserId { get; set; }
        public int DocumentId { get; set; }
        public int Role { get; set; }
    }
}
