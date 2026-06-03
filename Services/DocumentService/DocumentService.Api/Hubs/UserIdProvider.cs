using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace DocumentService.Api.Hubs
{
    public class UserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            // Пытаемся получить userId из клеймов
            return connection.User?.FindFirst("userId")?.Value;
        }
    }
}
