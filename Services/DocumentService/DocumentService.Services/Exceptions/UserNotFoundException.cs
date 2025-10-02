namespace DocumentService.Services.Exceptions
{
    public class UserNotFoundException(int id) : NotFoundException($"Пользователь с id {id} не найден.");
}
