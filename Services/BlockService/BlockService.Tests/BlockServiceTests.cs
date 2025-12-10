namespace BlockService.Tests
{
    using BlockService.DataAccess.Models;
    using BlockService.DataAccess.Repositories.Interfaces;
    using BlockService.Models.BlockText;
    using BlockService.Models.Permission;
    using BlockService.Services;
    using BlockService.Services.Exceptions;
    using Moq;

    public class BlockServiceTests
    {
        // Пользователь с ролью Editor или Creator может успешно отправить текстовый блок
        [Theory, AutoMoqData]
        public async Task SendBlock_ValidRequest_Success(
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            SendBlockRequest request,
            BlockService blockService)
        {
            // Arrange
            request.DocumentId = 123;
            request.UserId = 100;

            documentRepositoryMock.Setup(x => x.IsDocumentExists(123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(100, 123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(100, 123))
                .ReturnsAsync((int)DocumentRole.Editor);

            var blockId = 999;
            blockRepositoryMock.Setup(x => x.CreateBlock(It.IsAny<DbBlock>()))
                .ReturnsAsync(blockId);

            // Act
            var result = await blockService.SendBlock(request);

            // Assert
            Assert.Equal(blockId, result.Id);
            Assert.Equal(request.Text, result.Text);
            Assert.Equal(request.DocumentId, result.DocumentId);
            Assert.Equal(request.UserId, result.UserId);

            blockRepositoryMock.Verify(x => x.CreateBlock(
                It.Is<DbBlock>(b =>
                    b.Text == request.Text &&
                    b.DocumentId == request.DocumentId &&
                    b.UserId == request.UserId)), Times.Once);
        }

        // Ошибка, документ не найден
        [Theory, AutoMoqData]
        public async Task SendBlock_DocumentNotFound_ThrowsDocumentNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            BlockService blockService)
        {
            documentRepositoryMock.Setup(x => x.IsDocumentExists(999)).ReturnsAsync(false);
            var ex = await Assert.ThrowsAsync<DocumentNotFoundException>(() =>
                blockService.SendBlock(new SendBlockRequest { DocumentId = 999, UserId = 1 }));
            Assert.Contains("999", ex.Message);
        }

        // Ошибка, пользователь не участник документа
        [Theory, AutoMoqData]
        public async Task SendBlock_UserNotInDocument_ThrowsDocumentParticipantNotFoundException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockService blockService)
        {
            documentRepositoryMock.Setup(x => x.IsDocumentExists(123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(100, 123)).ReturnsAsync(false);
            var ex = await Assert.ThrowsAsync<DocumentParticipantNotFoundException>(() =>
                blockService.SendBlock(new SendBlockRequest { DocumentId = 123, UserId = 100 }));
            Assert.Contains("100", ex.Message);
            Assert.Contains("123", ex.Message);
        }

        // Ошибка, у пользователя недостаточно прав (Наблюдатель)
        [Theory, AutoMoqData]
        public async Task SendBlock_UserWithoutWriteAccess_ThrowsPermissionDeniedException(
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockService blockService)
        {
            documentRepositoryMock.Setup(x => x.IsDocumentExists(123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(100, 123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(100, 123))
                .ReturnsAsync((int)DocumentRole.Viewer); 

            var ex = await Assert.ThrowsAsync<PermissionDeniedException>(() =>
                blockService.SendBlock(new SendBlockRequest { DocumentId = 123, UserId = 100 }));
            Assert.Contains("Недостаточно прав", ex.Message);
        }

        // Участник документа получает список всех блоков
        [Theory, AutoMoqData]
        public async Task GetBlocksByDocument_ValidRequest_ReturnsBlocks(
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentRepository> documentRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockService blockService)
        {
            // Arrange
            var userId = 100;
            var documentId = 123;
            var from = DateTime.UtcNow.AddDays(-1);

            documentRepositoryMock.Setup(x => x.IsDocumentExists(documentId)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(userId, documentId)).ReturnsAsync(true);

            var dbBlocks = new List<DbBlock>
        {
            new() { Id = 1, Text = "Block1", DocumentId = documentId, UserId = userId },
            new() { Id = 2, Text = "Block2", DocumentId = documentId, UserId = userId }
        };
            blockRepositoryMock.Setup(x => x.GetBlocksByDocument(documentId, from)).ReturnsAsync(dbBlocks);

            // Act
            var result = await blockService.GetBlocksByDocument(userId, documentId, from);

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Equal("Block1", result[0].Text);
            Assert.Equal("Block2", result[1].Text);
        }

        // Пользователь с ролью Editor или Creator может редактировать любой блок
        [Theory, AutoMoqData]
        public async Task EditBlock_EditorEditsOtherBlock_Success(
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockService blockService)
        {
            // Arrange
            var request = new EditBlockRequest { Id = 1, UserId = 200, EditedText = "New text" };
            var existingBlock = new DbBlock { Id = 1, UserId = 100, DocumentId = 123, SentOn = DateTime.UtcNow };

            blockRepositoryMock.Setup(x => x.GetBlockById(1)).ReturnsAsync(existingBlock);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(200, 123))
                .ReturnsAsync((int)DocumentRole.Editor);
            blockRepositoryMock.Setup(x => x.EditBlock(1, "New text", It.IsAny<DateTime>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await blockService.EditBlock(request);

            // Assert
            Assert.Equal("New text", result.Text);
        }

        // Ошибка, блок не найден
        [Theory, AutoMoqData]
        public async Task EditBlock_BlockNotFound_ThrowsBlockNotFoundException(
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            BlockService blockService)
        {
            blockRepositoryMock.Setup(x => x.GetBlockById(999)).ReturnsAsync((DbBlock)null);
            var ex = await Assert.ThrowsAsync<BlockNotFoundException>(() =>
                blockService.EditBlock(new EditBlockRequest { Id = 999, UserId = 1 }));
            Assert.Contains("999", ex.Message);
        }
    }
}
