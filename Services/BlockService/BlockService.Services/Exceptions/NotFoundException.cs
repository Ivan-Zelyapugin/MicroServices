namespace BlockService.Services.Exceptions
{
    public abstract class NotFoundException(string message) : Exception(message);
}
