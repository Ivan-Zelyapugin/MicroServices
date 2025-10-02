namespace DocumentService.DataAccess.Models
{
    public class DbDocument
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int CreatorId { get; set; }
    }
}
