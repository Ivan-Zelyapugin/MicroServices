namespace AuthService.Services.Exceptions
{
    public abstract class BadRequestException(string message) : Exception(message);
}
