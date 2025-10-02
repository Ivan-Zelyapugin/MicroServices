using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System;

namespace EmailService.Infrastructure.Email
{
    public class MailRuTest
    {
        public static async Task TestAsync()
        {
            var protocolLogger = new ProtocolLogger(Console.OpenStandardOutput());
            using var smtp = new SmtpClient(protocolLogger);

            smtp.Timeout = 60000;
            smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

            Console.WriteLine("🔌 Подключаюсь к smtp.mail.ru:587 (STARTTLS)...");
            await smtp.ConnectAsync("smtp.mail.ru", 587, SecureSocketOptions.StartTls);

            Console.WriteLine("✅ Подключение установлено, пробую логин...");
            await smtp.AuthenticateAsync("zelyapugini@inbox.ru", "NVZWrKxakQ9Fjop6lXgd");

            Console.WriteLine("🎉 Успешная аутентификация!");

            var email = new MimeMessage();
            email.From.Add(MailboxAddress.Parse("zelyapugini@inbox.ru"));
            email.To.Add(MailboxAddress.Parse("zelyapugini@bk.ru"));
            email.Subject = "Подтверждение Email";
            email.Body = new TextPart("plain") { Text = $"Ваш код подтверждения: {5984}" };

            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}
