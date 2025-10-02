using DocumentService.Models.Permission;

namespace DocumentService.Models.Document
{
    public class DocumentDetails
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public DocumentParticipantFull Creator { get; set; }
        public List<DocumentParticipantFull> Participants { get; set; }
    }
}
