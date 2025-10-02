using DocumentService.Common;
using DocumentService.Models.Permission;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DocumentService.Api.Hubs
{
    [Authorize]
    public class BaseHub : Hub
    {
        private string Token => Context.GetHttpContext()?.Request.Query["access_token"];

        protected int Id => int.Parse(Jwt.GetId(Token));
        protected DocumentRole Role => Enum.Parse<DocumentRole>(Jwt.GetRole(Token));
        protected string Email => Jwt.GetEmail(Token);
        protected string Username => Jwt.GetUsername(Token);
    }
}
