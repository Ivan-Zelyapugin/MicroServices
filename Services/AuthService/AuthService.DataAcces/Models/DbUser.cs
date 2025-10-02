namespace AuthService.DataAcces.Models
{
    public class DbUser
    {
        public int Id { get; set; }
        public int Role { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string RefreshToken { get; set; }
        public DateTime RefreshTokenExpiredAfter { get; set; }
        public bool IsEmailConfirmed { get; set; }
    }
}
