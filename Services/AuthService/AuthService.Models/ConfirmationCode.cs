namespace AuthService.Models
{
    public class ConfirmationCode
    {
        public string Email { get; set; }
        public string Code { get; set; }
        public DateTime ExpiresAt { get; set; }

        public bool IsExpired() => DateTime.UtcNow > ExpiresAt;
    }
}
