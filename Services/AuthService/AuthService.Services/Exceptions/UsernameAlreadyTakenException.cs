namespace AuthService.Services.Exceptions
{
    public class UsernameAlreadyTakenException(string username) : BadRequestException($"Пользователь с логином {username} уже существует.");
}
