using BlockService.DataAccess.Models;
using BlockService.Models.BlockImage;

namespace BlockService.Services.Mapper
{
    public static class BlockImageMapper
    {
        public static DbBlockImage MapToDb(this SendBlockImageRequest source)
        {
            return source == null
                ? default
                : new DbBlockImage
                {
                    BlockId = source.BlockId,
                    Url = source.Url,
                    UploadedOn = source.UploadedOn,
                    UserId = source.UserId
                };
        }

        public static BlockImage MapToDomain(this DbBlockImage source)
        {
            return source == null
                ? default
                : new BlockImage
                {
                    Id = source.Id,
                    BlockId = source.BlockId,
                    Url = source.Url,
                    UploadedOn = source.UploadedOn,
                    UserId = source.UserId
                };
        }

        public static List<BlockImage> MapToDomain(this List<DbBlockImage> source)
        {
            return source == null ? [] : source.Select(x => x.MapToDomain()).ToList();
        }
    }
}
