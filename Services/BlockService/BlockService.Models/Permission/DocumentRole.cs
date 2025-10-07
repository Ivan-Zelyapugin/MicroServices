using System.Text.Json.Serialization;

namespace BlockService.Models.Permission
{
    [Flags]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DocumentRole
    {
        User    = 0,
        Viewer  = 1,
        Editor  = 2,
        Creator = 3
    }
}
