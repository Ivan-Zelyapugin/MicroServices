using AuthService.Common;
using AuthService.Models.Enums;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Api.Controllers
{
    [ApiController]
    public class BaseController : ControllerBase
    {
        protected string AuthHeader => HttpContext.Request.Headers.Authorization.ToString();

        protected int Id => int.Parse(Jwt.GetId(AuthHeader));
        protected Role Role => Enum.Parse<Role>(Jwt.GetRole(AuthHeader));
        protected string Email => Jwt.GetEmail(AuthHeader);
        protected string Username => Jwt.GetUsername(AuthHeader);
    }
}
