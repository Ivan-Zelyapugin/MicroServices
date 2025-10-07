namespace BlockService.DataAccess.Repositories.Interfaces
{
    public interface IDocumentRepository
    {
        Task<bool> IsDocumentExists(int id);
    }
}
