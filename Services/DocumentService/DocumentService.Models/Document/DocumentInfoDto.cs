namespace DocumentService.Models.Document
{
    public class DocumentInfoDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string CreatorUsername { get; set; }
        public List<DocumentUserDto> Users { get; set; }
    }
}
