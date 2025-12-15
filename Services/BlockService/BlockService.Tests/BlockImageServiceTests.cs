namespace BlockService.Tests
{
    using BlockService.DataAccess.Models;
    using BlockService.DataAccess.Repositories.Interfaces;
    using BlockService.Models.BlockImage;
    using BlockService.Models.Permission;
    using BlockService.Services;
    using BlockService.Services.Exceptions;
    using Moq;
    using System.Text;

    public class BlockImageServiceTests
    {

        // Пользователь с правами записи может загрузить изображение к блоку
        [Theory, AutoMoqData]
        public async Task SendBlockImage_ValidRequest_Success(
            [Frozen] Mock<IBlockImageRepository> imageRepositoryMock,
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            SendBlockImageRequest request,
            BlockImageService service)
        {
            // Arrange
            request.BlockId = 100;
            request.UserId = 200;
            var file = new FileUpload
            {
                FileName = "test.png",
                ContentBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("fake")),
                ContentType = "image/png"
            };

            var block = new DbBlock { Id = 100, DocumentId = 123, UserId = 150 };
            blockRepositoryMock.Setup(x => x.IsBlockExists(100)).ReturnsAsync(true);
            blockRepositoryMock.Setup(x => x.GetBlockById(100)).ReturnsAsync(block);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(200, 123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(200, 123))
                .ReturnsAsync((int)DocumentRole.Editor);

            var imageId = 999;
            imageRepositoryMock.Setup(x => x.CreateBlockImage(It.IsAny<DbBlockImage>()))
                .ReturnsAsync(imageId);

            // Act
            var result = await service.SendBlockImage(request, file);

            // Assert
            Assert.Equal(imageId, result.Id);
            Assert.Contains("images/", result.Url);
        }

        // Ошибка нельзя прикрепить изображение к несуществующему блоку
        [Theory, AutoMoqData]
        public async Task SendBlockImage_BlockNotFound_ThrowsBlockNotFoundException(
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            BlockImageService service)
        {
            blockRepositoryMock.Setup(x => x.IsBlockExists(999)).ReturnsAsync(false);
            var ex = await Assert.ThrowsAsync<BlockNotFoundException>(() =>
                service.SendBlockImage(
                    new SendBlockImageRequest { BlockId = 999, UserId = 1 },
                    new FileUpload { FileName = "test.png", ContentBase64 = "aGVsbG8=" }));
            Assert.Contains("999", ex.Message);
        }

        // Пользователь с правами записи может удалить изображение
        [Theory, AutoMoqData]
        public async Task DeleteBlockImage_EditorDeletesImage_Success(
            [Frozen] Mock<IBlockImageRepository> imageRepositoryMock,
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockImageService service)
        {
            // Arrange
            var image = new DbBlockImage
            {
                Id = 1,
                BlockId = 100,
                Url = "images/documents/123/blocks/100/test.png"
            };
            var block = new DbBlock { Id = 100, DocumentId = 123 };

            imageRepositoryMock.Setup(x => x.GetImageById(1)).ReturnsAsync(image);
            blockRepositoryMock.Setup(x => x.GetBlockById(100)).ReturnsAsync(block);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(200, 123)).ReturnsAsync(true);
            participantRepositoryMock.Setup(x => x.GetUserRoleInDocument(200, 123))
                .ReturnsAsync((int)DocumentRole.Editor);

            imageRepositoryMock.Setup(x => x.DeleteImage(1)).Returns(Task.CompletedTask);

            // Act
            await service.DeleteBlockImage(1, 200);

            // Assert
            imageRepositoryMock.Verify(x => x.DeleteImage(1), Times.Once);
        }

        // Участник документа получает список всех изображений, прикреплённых к блоку
        [Theory, AutoMoqData]
        public async Task GetBlockImagesByBlock_ValidRequest_ReturnsImages(
            [Frozen] Mock<IBlockImageRepository> imageRepositoryMock,
            [Frozen] Mock<IBlockRepository> blockRepositoryMock,
            [Frozen] Mock<IDocumentParticipantRepository> participantRepositoryMock,
            BlockImageService service)
        {
            // Arrange
            var block = new DbBlock { Id = 100, DocumentId = 123 };
            blockRepositoryMock.Setup(x => x.GetBlockById(100)).ReturnsAsync(block);
            participantRepositoryMock.Setup(x => x.IsDocumentParticipantExists(200, 123)).ReturnsAsync(true);

            var dbImages = new List<DbBlockImage>
        {
            new() { Id = 1, BlockId = 100, Url = "url1" },
            new() { Id = 2, BlockId = 100, Url = "url2" }
        };
            imageRepositoryMock.Setup(x => x.GetImagesByBlockId(100)).ReturnsAsync(dbImages);

            // Act
            var result = await service.GetBlockImagesByBlock(200, 100);

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Equal("url1", result[0].Url);
            Assert.Equal("url2", result[1].Url);
        }
    }
}
