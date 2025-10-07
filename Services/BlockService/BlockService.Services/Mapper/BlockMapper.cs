using BlockService.DataAccess.Models;
using BlockService.Models.BlockText;

namespace BlockService.Services.Mapper
{
    public static class BlockMapper
    {
        public static DbBlock MapToDb(this SendBlockRequest source)
        {
            return source == null
                ? default
                : new DbBlock
                {
                    Text = source.Text,
                    DocumentId = source.DocumentId,
                    SentOn = source.SentOn,
                    UserId = source.UserId
                };
        }

        public static Block MapToDomain(this DbBlock source)
        {
            return source == null
                ? default
                : new Block
                {
                    Id = source.Id,
                    Text = source.Text,
                    SentOn = source.SentOn,
                    DocumentId = source.DocumentId,
                    UserId = source.UserId,
                    EditedOn = source.EditedOn
                };
        }

        public static List<Block> MapToDomain(this List<DbBlock> source)
        {
            return source == null ? [] : source.Select(x => x.MapToDomain()).ToList();
        }

        public static Block MapToDomain(this EditBlockRequest source, DateTime sentOn, int documentId)
        {
            return source == null
                ? default
                : new Block
                {
                    Id = source.Id,
                    Text = source.EditedText,
                    SentOn = sentOn,
                    DocumentId = documentId,
                    UserId = source.UserId,
                    EditedOn = source.EditedOn
                };
        }
    }
}
