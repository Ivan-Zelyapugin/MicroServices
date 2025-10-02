namespace AuthService.Services.Exceptions
{
    public class BadCredentialsException() : BadRequestException("Некорректный логин и/или пароль.");
}
