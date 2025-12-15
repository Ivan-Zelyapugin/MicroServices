using System.Text.Json.Serialization;

namespace AuthService.Models
{
    public class UpdateUserRequest
    {
        [JsonIgnore]
        public int Id { get; set; }

        public string? Username { get; set; }
        public string? Email { get; set; }
    }
}
