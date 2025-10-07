using BlockService.Models.BlockImage;

namespace BlockService.Services.Interfaces
{
    public interface IBlockImageService
    {
        Task<BlockImage> SendBlockImage(SendBlockImageRequest request, FileUpload file);
        Task<List<BlockImage>> GetBlockImagesByBlock(int userId, int blockId);
        Task DeleteBlockImage(int id, int userId);
    }
}
