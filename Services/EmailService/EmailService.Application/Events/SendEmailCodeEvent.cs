namespace EmailService.Application.Events
{
    public class SendEmailCodeEvent
    {
        public string Email { get; set; }
        public string Code { get; set; }
    }
}
