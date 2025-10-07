using BlockService.Common;
using BlockService.Models.Permission;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlockService.Api.Controllers
{
    [Authorize]
    [ApiController]
    public class BaseController : ControllerBase
    {
        private string AuthHeader => HttpContext.Request.Headers.Authorization.ToString();

        protected int Id => int.Parse(Jwt.GetId(AuthHeader));
        protected DocumentRole Role => Enum.Parse<DocumentRole>(Jwt.GetRole(AuthHeader));
        protected string Email => Jwt.GetEmail(AuthHeader);
        protected string Username => Jwt.GetUsername(AuthHeader);
    }
}
