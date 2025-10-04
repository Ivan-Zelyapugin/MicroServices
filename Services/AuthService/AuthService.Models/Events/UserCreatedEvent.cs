namespace AuthService.Models.Events
{
    public class UserCreatedEvent
    {
        public int Id { get; set; }
        public string Email { get; set; }
    }
}
