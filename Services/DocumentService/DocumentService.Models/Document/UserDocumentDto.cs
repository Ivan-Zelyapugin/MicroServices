using DocumentService.Models.Permission;

namespace DocumentService.Models.Document
{
    public class UserDocumentDto
    {
        public Document Document { get; set; }
        public DocumentRole Role { get; set; }
    }
}
