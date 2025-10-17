using System.Text.Json.Serialization;

namespace DocumentService.Models.Document
{
    public class CreateDocumentRequest
    {
        public string Name { get; set; }
        [JsonPropertyName("Usernames")]
        public List<string> Usernames { get; set; }
        public List<string> Roles { get; set; }
        [JsonIgnore]
        public List<int> UserIds { get; set; }
        [JsonIgnore]
        public int CreatorId { get; set; }
    }
}
