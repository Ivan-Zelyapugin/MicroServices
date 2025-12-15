using DocumentService.DataAccess.Dapper.Interfaces;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Models.Permission;
using DocumentService.Services.Exceptions;

namespace DocumentService.Tests
{
    public class DocumentServiceTests
    {
        // успешное создание документа с участниками и правильными ролями
        [Theory, AutoMoqData]
        public async Task CreateDocument_ValidRequest_Success(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IUserRepository> userRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            CreateDocumentRequest request,
            Services.DocumentService documentService)
        {
            // Arrange
            request.CreatorId = 100;
            request.UserIds = new List<int> { 200, 300 }; 
            request.Roles = new List<string> { "Editor", "Viewer" }; 

            userRepositoryMock.Setup(x => x.IsUserExistsById(100)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(200)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(300)).ReturnsAsync(true);

            var documentId = 999;
            documentRepositoryMock
                .Setup(x => x.CreateDocument(It.IsAny<DbDocument>(), It.IsAny<ITransaction>()))
                .ReturnsAsync(documentId);

            participantRepositoryMock
                .Setup(x => x.CreateDocumentParticipants(It.IsAny<List<DbDocumentParticipant>>(), It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await documentService.CreateDocument(request);

            // Assert
            Assert.Equal(documentId, result.Id);
            Assert.Equal(request.Name, result.Name);

            userRepositoryMock.Verify(x => x.IsUserExistsById(100), Times.Once);
            userRepositoryMock.Verify(x => x.IsUserExistsById(200), Times.Once);
            userRepositoryMock.Verify(x => x.IsUserExistsById(300), Times.Once);

            documentRepositoryMock.Verify(x => x.CreateDocument(
                It.Is<DbDocument>(d => d.Name == request.Name && d.CreatorId == request.CreatorId),
                It.IsNotNull<ITransaction>()), Times.Once);

            participantRepositoryMock.Verify(x => x.CreateDocumentParticipants(
                It.Is<List<DbDocumentParticipant>>(list =>
                    list.Count == 3 &&
                    list.Any(p => p.UserId == 100 && p.Role == 3) && 
                    list.Any(p => p.UserId == 200 && p.Role == 1) && 
                    list.Any(p => p.UserId == 300 && p.Role == 0)),  
                It.IsNotNull<ITransaction>()), Times.Once);
        }

        // ошибка, если хотя бы один пользователь не существует
        [Theory, AutoMoqData]
        public async Task CreateDocument_UserNotFound_ThrowsUserNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IUserRepository> userRepositoryMock,
            CreateDocumentRequest request,
            Services.DocumentService documentService)
        {
            // Arrange
            request.CreatorId = 1;
            request.UserIds = new List<int> { 1, 999 }; 

            userRepositoryMock.Setup(x => x.IsUserExistsById(1)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(999)).ReturnsAsync(false);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UserNotFoundException>(() => documentService.CreateDocument(request));
            Assert.Contains("999", ex.Message);
        }

        // создатель может удалить документ
        [Theory, AutoMoqData]
        public async Task DeleteDocument_Creator_Success(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var documentId = 123;
            var creatorId = 456;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(creatorId, documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(creatorId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);

            documentRepositoryMock.Setup(x => x.DeleteDocument(documentId, It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            await documentService.DeleteDocument(documentId, creatorId);

            // Assert
            documentRepositoryMock.Verify(x => x.DeleteDocument(documentId, It.IsNotNull<ITransaction>()), Times.Once);
        }

        // ошибка только создатель может удалять
        [Theory, AutoMoqData]
        public async Task DeleteDocument_NonCreator_ThrowsPermissionDeniedException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var documentId = 123;
            var userId = 456;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, documentId))
                .ReturnsAsync((int)DocumentRole.Editor);

            // Act & Assert
            await Assert.ThrowsAsync<PermissionDeniedException>(() => documentService.DeleteDocument(documentId, userId));
        }

        // ошибка, если документ не существует
        [Theory, AutoMoqData]
        public async Task DeleteDocument_DocumentNotFound_ThrowsDocumentNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            Services.DocumentService documentService)
        {
            documentRepositoryMock.Setup(x => x.IsDocumentExists(999)).ReturnsAsync(false);
            await Assert.ThrowsAsync<DocumentNotFoundException>(() => documentService.DeleteDocument(999, 1));
        }

        // возвращает список документов пользователя
        [Theory, AutoMoqData]
        public async Task GetDocumentsByUserId_ReturnsMappedDocuments(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var userId = 101;
            var dbDocs = new List<DbDocument>
        {
            new() { Id = 1, Name = "Doc1", CreatorId = 101 },
            new() { Id = 2, Name = "Doc2", CreatorId = 202 }
        };

            documentRepositoryMock.Setup(x => x.GetDocumentsByUserId(userId)).ReturnsAsync(dbDocs);

            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, 1))
                .ReturnsAsync((int)DocumentRole.Creator);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, 2))
                .ReturnsAsync((int)DocumentRole.Editor);

            // Act
            var result = await documentService.GetDocumentsByUserId(userId);

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Equal("Doc1", result[0].Document.Name);
            Assert.Equal(DocumentRole.Creator, result[0].Role);
            Assert.Equal("Doc2", result[1].Document.Name);
            Assert.Equal(DocumentRole.Editor, result[1].Role);
        }

        // возвращает полную информацию о документе
        [Theory, AutoMoqData]
        public async Task GetDocumentDetails_DocumentExists_ReturnsDetails(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var details = new DocumentDetails
            {
                Id = 1,
                Name = "Test Doc",
                Creator = new DocumentParticipantFull { UserId = 100, Username = "creator" },
                Participants = new List<DocumentParticipantFull>
            {
                new() { UserId = 200, Username = "editor", Role = DocumentRole.Editor }
            }
            };

            documentRepositoryMock.Setup(x => x.GetDocumentDetails(1)).ReturnsAsync(details);

            // Act
            var result = await documentService.GetDocumentDetails(1);

            // Assert
            Assert.Equal(details.Id, result.Id);
            Assert.Equal(details.Name, result.Name);
        }

        // ошибка, если документ не найден
        [Theory, AutoMoqData]
        public async Task GetDocumentDetails_DocumentNotFound_ThrowsDocumentNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            Services.DocumentService documentService)
        {
            documentRepositoryMock.Setup(x => x.GetDocumentDetails(999)).ReturnsAsync((DocumentDetails)null);
            await Assert.ThrowsAsync<DocumentNotFoundException>(() => documentService.GetDocumentDetails(999));
        }

        // успешное добавление новых пользователей в документ
        [Theory, AutoMoqData]
        public async Task AddUsersToDocument_ValidRequest_Success(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IUserRepository> userRepositoryMock,
            AddUsersToDocumentRequest request,
            Services.DocumentService documentService)
        {
            // Arrange
            request.DocumentId = 123;
            request.RequestingUserId = 100;
            request.UserIds = new List<int> { 200, 300 };
            request.Roles = new List<string> { "Editor", "User" };

            documentRepositoryMock.Setup(x => x.IsDocumentExists(123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(100, 123)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(200)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(300)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(200, 123)).ReturnsAsync(false);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(300, 123)).ReturnsAsync(false);

            participantRepositoryMock.Setup(x => x.CreateDocumentParticipants(It.IsAny<List<DbDocumentParticipant>>(), null))
                .Returns(Task.CompletedTask);

            // Act
            await documentService.AddUsersToDocument(request);

            // Assert
            participantRepositoryMock.Verify(x => x.CreateDocumentParticipants(
                It.Is<List<DbDocumentParticipant>>(list =>
                    list.Count == 2 &&
                    list.Any(p => p.UserId == 200 && p.Role == (int)DocumentRole.Editor) &&
                    list.Any(p => p.UserId == 300 && p.Role == (int)DocumentRole.User)),
                null), Times.Once);
        }

        // ошибка, если пользователь уже в документе
        [Theory, AutoMoqData]
        public async Task AddUsersToDocument_UserAlreadyInDocument_ThrowsUserAlreadyInDocumentException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            [Frozen] Mock<IUserRepository> userRepositoryMock,
            AddUsersToDocumentRequest request,
            Services.DocumentService documentService)
        {
            // Arrange
            request.DocumentId = 123;
            request.RequestingUserId = 100;
            request.UserIds = new List<int> { 200 };
            request.Roles = new List<string> { "Editor" };

            documentRepositoryMock.Setup(x => x.IsDocumentExists(123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(100, 123)).ReturnsAsync(true);
            userRepositoryMock.Setup(x => x.IsUserExistsById(200)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(200, 123)).ReturnsAsync(true); // уже участник

            // Act & Assert
            var ex = await Assert.ThrowsAsync<UserAlreadyInDocumentException>(() => documentService.AddUsersToDocument(request));
            Assert.Contains("200", ex.Message);
            Assert.Contains("123", ex.Message);
        }

        // создатель может переименовать документ
        [Theory, AutoMoqData]
        public async Task RenameDocument_Creator_Success(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var documentId = 123;
            var userId = 100;
            var newName = "New Name";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, documentId))
                .ReturnsAsync((int)DocumentRole.Creator);

            documentRepositoryMock.Setup(x => x.UpdateDocumentName(documentId, newName, It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            await documentService.RenameDocument(documentId, newName, userId);

            // Assert
            documentRepositoryMock.Verify(x => x.UpdateDocumentName(documentId, newName, It.IsNotNull<ITransaction>()), Times.Once);
        }

        // редактор может переименовать документ
        [Theory, AutoMoqData]
        public async Task RenameDocument_Editor_Success(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var documentId = 123;
            var userId = 200;
            var newName = "New Name";

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, documentId))
                .ReturnsAsync((int)DocumentRole.Editor);

            documentRepositoryMock.Setup(x => x.UpdateDocumentName(documentId, newName, It.IsAny<ITransaction>()))
                .Returns(Task.CompletedTask);

            // Act
            await documentService.RenameDocument(documentId, newName, userId);

            // Assert
            documentRepositoryMock.Verify(x => x.UpdateDocumentName(documentId, newName, It.IsNotNull<ITransaction>()), Times.Once);
        }

        // наблюдатель не может переименовывать
        [Theory, AutoMoqData]
        public async Task RenameDocument_Viewer_ThrowsPermissionDeniedException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            Services.DocumentService documentService)
        {
            // Arrange
            var documentId = 123;
            var userId = 300;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(userId, documentId))
                .ReturnsAsync((int)DocumentRole.User);

            // Act & Assert
            await Assert.ThrowsAsync<PermissionDeniedException>(() => documentService.RenameDocument(documentId, "New", userId));
        }
    }
}
