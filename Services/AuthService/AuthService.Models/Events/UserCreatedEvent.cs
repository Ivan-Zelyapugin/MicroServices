namespace AuthService.Models.Events
{
    public class UserCreatedEvent
    {
        public int UserId { get; set; }
        public string Email { get; set; }
    }
}
