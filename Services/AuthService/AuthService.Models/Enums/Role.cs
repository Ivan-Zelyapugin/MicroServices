using System.Text.Json.Serialization;

namespace AuthService.Models.Enums
{
    [Flags]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum Role
    {
        User   = 0,
        Viewer = 1,
        Editor = 2,
        Admin  = 3,
        All = Viewer | Editor | Admin | User
    }
}
