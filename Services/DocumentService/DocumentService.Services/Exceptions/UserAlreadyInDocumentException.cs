namespace DocumentService.Services.Exceptions
{
    public class UserAlreadyInDocumentException(int userId, int documentId) : BadRequestException($"Пользователь с id {userId} уже есть в чате с id {documentId}");
}
