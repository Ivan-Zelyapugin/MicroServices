namespace BlockService.Services.Exceptions
{
    public class DocumentParticipantNotFoundException(int userId, int documentId) : NotFoundException($"Пользователя с id {userId} нет в документе с id {documentId}.");
}
