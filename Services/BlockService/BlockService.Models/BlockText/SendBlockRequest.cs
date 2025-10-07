using System.Text.Json.Serialization;

namespace BlockService.Models.BlockText
{
    public class SendBlockRequest
    {
        public string Text { get; set; }
        public int DocumentId { get; set; }
        [JsonIgnore]
        public DateTime SentOn { get; set; }
        [JsonIgnore]
        public int UserId { get; set; }
    }
}
