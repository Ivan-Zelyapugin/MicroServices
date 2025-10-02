namespace AuthService.Models
{
    public class ConfirmEmailModel
    {
        public int UserId { get; set; }
        public string Code { get; set; }
    }
}
