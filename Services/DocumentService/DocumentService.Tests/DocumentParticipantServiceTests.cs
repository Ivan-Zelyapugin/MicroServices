using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Permission;
using DocumentService.Services;
using DocumentService.Services.Exceptions;

namespace DocumentService.Tests
{
    public class DocumentParticipantServiceTests
    {
        // Создатель документа может успешно удалить другого участника
        [Theory, AutoMoqData]
        public async Task RemoveUserFromDocument_CreatorRemovesParticipant_Success(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userIdToRemove = 200;
            var creatorId = 100;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userIdToRemove, documentId))
                .ReturnsAsync(true);

            participantRepositoryMock.Setup(x => x.DeleteDocumentParticipant(documentId, userIdToRemove, It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            await service.RemoveUserFromDocument(documentId, userIdToRemove, creatorId);

            // Assert
            participantRepositoryMock.Verify(x => x.DeleteDocumentParticipant(
                documentId, userIdToRemove, It.IsNotNull<ITransaction>()), Times.Once);
        }

        // Только создатель может удалять участников
        [Theory, AutoMoqData]
        public async Task RemoveUserFromDocument_NonCreator_ThrowsPermissionDeniedException(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userIdToRemove = 200;
            var editorId = 100;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(editorId, documentId))
                .ReturnsAsync((int)DocumentRole.Editor);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<PermissionDeniedException>(() =>
                service.RemoveUserFromDocument(documentId, userIdToRemove, editorId));
            Assert.Contains("Удаление пользователей доступно только создателю документа", ex.Message);
        }

        // Ошибка, документа нет
        [Theory, AutoMoqData]
        public async Task RemoveUserFromDocument_DocumentNotFound_ThrowsDocumentNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            documentRepositoryMock.Setup(x => x.IsDocumentExists(999)).ReturnsAsync(false);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<DocumentNotFoundException>(() =>
                service.RemoveUserFromDocument(999, 200, 100));
            Assert.Contains("999", ex.Message);
        }

        // Ошибка, участника нет в документе
        [Theory, AutoMoqData]
        public async Task RemoveUserFromDocument_UserNotInDocument_ThrowsDocumentParticipantNotFoundException(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userIdToRemove = 200;
            var creatorId = 100;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userIdToRemove, documentId))
                .ReturnsAsync(false); 

            // Act & Assert
            var ex = await Assert.ThrowsAsync<DocumentParticipantNotFoundException>(() =>
                service.RemoveUserFromDocument(documentId, userIdToRemove, creatorId));
            Assert.Contains($"{userIdToRemove}", ex.Message);
            Assert.Contains($"{documentId}", ex.Message);
        }

        // Создатель может успешно изменить роль другого участника
        [Theory, AutoMoqData]
        public async Task ChangeUserRoleInDocument_CreatorChangesRole_Success(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userId = 200;
            var creatorId = 100;
            var newRoleStr = "Editor";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId))
                .ReturnsAsync(true);

            participantRepositoryMock.Setup(x => x.UpdateUserRoleInDocument(documentId, userId, (int)DocumentRole.Editor, It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            await service.ChangeUserRoleInDocument(documentId, userId, newRoleStr, creatorId);

            // Assert
            participantRepositoryMock.Verify(x => x.UpdateUserRoleInDocument(
                documentId, userId, (int)DocumentRole.Editor, It.IsNotNull<ITransaction>()), Times.Once);
        }

        // Ошибка, только создатель может менять роли
        [Theory, AutoMoqData]
        public async Task ChangeUserRoleInDocument_NonCreator_ThrowsPermissionDeniedException(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userId = 200;
            var editorId = 100;
            var newRoleStr = "Admin";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(editorId, documentId))
                .ReturnsAsync((int)DocumentRole.Editor);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<PermissionDeniedException>(() =>
                service.ChangeUserRoleInDocument(documentId, userId, newRoleStr, editorId));
            Assert.Contains("Изменение ролей доступно только создателю документа", ex.Message);
        }

        // Ошибка, пользователя нет (нельзя изменить роль)
        [Theory, AutoMoqData]
        public async Task ChangeUserRoleInDocument_UserNotInDocument_ThrowsDocumentParticipantNotFoundException(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userId = 200;
            var creatorId = 100;
            var newRoleStr = "Admin";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId))
                .ReturnsAsync(false);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<DocumentParticipantNotFoundException>(() =>
                service.ChangeUserRoleInDocument(documentId, userId, newRoleStr, creatorId));
            Assert.Contains($"{userId}", ex.Message);
            Assert.Contains($"{documentId}", ex.Message);
        }

        // Ошибка, невалидная роль
        [Theory, AutoMoqData]
        public async Task ChangeUserRoleInDocument_InvalidRole_ThrowsArgumentException(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var documentId = 123;
            var userId = 200;
            var creatorId = 100;
            var invalidRoleStr = "InvalidRole";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId))
                .ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.ChangeUserRoleInDocument(documentId, userId, invalidRoleStr, creatorId));
        }

        // Список всех документов в котором участвует пользователь
        [Theory, AutoMoqData]
        public async Task GetDocumentParticipantsByUserId_ReturnsMappedParticipants(
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            DocumentParticipantService service)
        {
            // Arrange
            var userId = 100;
            var dbParticipants = new List<DbDocumentParticipant>
        {
            new() { DocumentId = 1, UserId = 100, Role = (int)DocumentRole.Creator },
            new() { DocumentId = 2, UserId = 100, Role = (int)DocumentRole.Editor }
        };

            participantRepositoryMock.Setup(x => x.GetDocumentParticipantsByUserId(userId))
                .ReturnsAsync(dbParticipants);

            // Act
            var result = await service.GetDocumentParticipantsByUserId(userId);

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Equal(1, result[0].DocumentId);
            Assert.Equal(DocumentRole.Creator, result[0].Role);
            Assert.Equal(2, result[1].DocumentId);
            Assert.Equal(DocumentRole.Editor, result[1].Role);
        }
    }
}
