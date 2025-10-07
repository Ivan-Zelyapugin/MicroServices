namespace BlockService.Services.Exceptions
{
    public class BlockImageNotFoundException(int id) : NotFoundException($"Изображение с id {id} не найдено.");
}
