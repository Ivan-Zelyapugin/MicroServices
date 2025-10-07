namespace BlockService.Models.BlockText
{
    public class Block
    {
        public int Id { get; set; }
        public string Text { get; set; }
        public DateTime SentOn { get; set; }
        public int DocumentId { get; set; }
        public int UserId { get; set; }
        public DateTime? EditedOn { get; set; }

    }
}
