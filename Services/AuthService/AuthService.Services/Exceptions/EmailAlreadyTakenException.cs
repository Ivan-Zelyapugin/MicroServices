namespace AuthService.Services.Exceptions
{
    public class EmailAlreadyTakenException(string email) : BadRequestException($"Пользователь с почтой {email} уже существует.");
}
