using System.Text.Json.Serialization;

namespace DocumentService.Models.Document
{
    public class AddUsersToDocumentRequest
    {
        public int DocumentId { get; set; }
        public List<string> Usernames { get; set; }
        public List<string>? Roles { get; set; }
        [JsonIgnore]
        public List<int> UserIds { get; set; }
        [JsonIgnore]
        public int RequestingUserId { get; set; }
    }
}
