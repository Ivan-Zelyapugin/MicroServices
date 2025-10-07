namespace BlockService.Models.BlockImage
{
    public class SendBlockImageRequest
    {
        public int BlockId { get; set; }
        public string Url { get; set; }
        public DateTime UploadedOn { get; set; }
        public int UserId { get; set; }

    }
}
