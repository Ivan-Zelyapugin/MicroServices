using AuthService.Domain.Enums;

namespace AuthService.Domain.Entities
{
    public class DbUser
    {
        public int Id { get; private set; }
        public Role Role { get; private set; }
        public string Username { get; private set; }
        public string Email { get; private set; }
        public string PasswordHash { get; private set; }
        public string? RefreshToken { get; private set; }
        public DateTime? RefreshTokenExpiresAt { get; private set; }
        public bool EmailConfirmed { get; private set; }
    }
}
