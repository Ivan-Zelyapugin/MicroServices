namespace AuthService.Services.Exceptions
{
    public class InvalidInputException : BadRequestException
    {
        public InvalidInputException(string message) : base(message)
        {
        }
    }
}
