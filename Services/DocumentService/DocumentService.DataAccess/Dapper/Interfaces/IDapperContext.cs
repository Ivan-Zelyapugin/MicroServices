namespace DocumentService.DataAccess.Dapper.Interfaces
{
    public interface IDapperContext<TSettings> where TSettings : IDapperSettings
    {
        Task<T> FirstOrDefault<T>(IQueryObject queryObject);
        Task<List<T>> ListOrEmpty<T>(IQueryObject queryObject);
        Task Command(IQueryObject queryObject, ITransaction transaction = null);
        Task<T> CommandWithResponse<T>(IQueryObject queryObject, ITransaction transaction = null);
        ITransaction BeginTransaction();
    }
}
