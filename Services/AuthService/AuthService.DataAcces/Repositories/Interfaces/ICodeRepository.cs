using AuthService.Models;

namespace AuthService.DataAcces.Repositories.Interfaces
{
    public interface ICodeRepository
    {
        Task SaveAsync(ConfirmationCode code);
        Task<ConfirmationCode?> GetAsync(string email);
        Task DeleteAsync(string email);
    }
}
