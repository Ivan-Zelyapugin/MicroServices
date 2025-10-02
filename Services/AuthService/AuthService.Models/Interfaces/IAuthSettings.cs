namespace AuthService.Models.Interfaces
{
    public interface IAuthSettings
    {
        public string Issuer { get; }
        public string Audience { get; }
        public string Key { get; }
        int AccessTokenExpiresInMinutes { get; }
        int RefreshTokenExpiresInDays { get; }
    }
}
