namespace BlockService.Models.BlockImage
{
    public class BlockImage
    {
        public int Id { get; set; }
        public int BlockId { get; set; }
        public string Url { get; set; }
        public DateTime UploadedOn { get; set; }
        public int UserId { get; set; }
    }
}
