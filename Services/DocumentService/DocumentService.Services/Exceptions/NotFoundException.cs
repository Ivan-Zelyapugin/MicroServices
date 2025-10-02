namespace DocumentService.Services.Exceptions
{
    public abstract class NotFoundException(string message) : Exception(message);
}
