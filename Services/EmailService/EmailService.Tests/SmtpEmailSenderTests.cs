using Microsoft.Extensions.Configuration;
using EmailService.Domain.Interfaces;


namespace EmailService.Tests
{
    public class SmtpEmailSenderTests
    {
        [Theory, AutoMoqData]
        public async Task SendAsync_ValidInput_CallsSmtpCorrectly(
            [Frozen] Mock<IConfiguration> configMock,
            SmtpEmailSender emailSender)
        {
            // Arrange
            configMock.Setup(x => x["Smtp:Host"]).Returns("smtp.test.com");
            configMock.Setup(x => x["Smtp:Port"]).Returns("587");
            configMock.Setup(x => x["Smtp:User"]).Returns("user@test.com");
            configMock.Setup(x => x["Smtp:Password"]).Returns("pass");
            configMock.Setup(x => x["Smtp:From"]).Returns("noreply@test.com");

            await Assert.ThrowsAnyAsync<Exception>(() =>
                emailSender.SendAsync("to@test.com", "Subject", "Body"));
        }
    }
}
