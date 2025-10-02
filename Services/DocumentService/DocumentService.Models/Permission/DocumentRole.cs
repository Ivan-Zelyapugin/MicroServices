using System.Text.Json.Serialization;

namespace DocumentService.Models.Permission
{
    [Flags]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DocumentRole
    {
        Viewer = 0,
        Editor = 1,
        Admin = 2,
        Creator = 3,
        User = 4
    }
}
