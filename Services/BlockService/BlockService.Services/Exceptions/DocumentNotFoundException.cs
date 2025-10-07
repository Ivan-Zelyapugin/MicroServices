namespace BlockService.Services.Exceptions
{
    public class DocumentNotFoundException(int id) : NotFoundException($"Документ с id {id} не найден.");
}
