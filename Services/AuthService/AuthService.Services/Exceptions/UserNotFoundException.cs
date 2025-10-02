namespace AuthService.Services.Exceptions
{
    public class UserNotFoundException(string email) : BadRequestException($"Пользователя с email {email} не существует.");
}
