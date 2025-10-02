namespace DocumentService.DataAccess.Dapper.Interfaces
{
    public interface ITransaction : IDisposable
    {
        Task<T> CommandWithResponse<T>(IQueryObject queryObject);
        Task Command(IQueryObject queryObject);
        public void Commit();
        public void Rollback();
    }
}
