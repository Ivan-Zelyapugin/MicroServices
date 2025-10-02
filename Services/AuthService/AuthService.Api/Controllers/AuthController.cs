using AuthService.Models;
using AuthService.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(IAuthService authService, ITokenService tokenService) : ControllerBase
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            var userId = await authService.Register(model);
            return Accepted(new
            {
                message = "Код подтверждения отправлен на e-mail",
                userId
            });
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            var authResponse = await authService.Login(model);
            return Ok(authResponse);
        }

        [HttpPut("refresh-token/{token}")]
        public async Task<IActionResult> RefreshToken(string token)
        {
            return Ok(await tokenService.RefreshToken(token));
        }

        [HttpPost("confirm-email")]
        public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailModel model)
        {
            var authResponse = await authService.ConfirmEmail(model.UserId, model.Code);
            return Ok(authResponse);
        }
    }
}
