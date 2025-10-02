using EmailService.Domain.Interfaces;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using System;
using System.IO;

public class SmtpEmailSender : IEmailSender
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _username;
    private readonly string _password;
    private readonly string _from;

    public SmtpEmailSender(IConfiguration config)
    {
        _host = config["Smtp:Host"] ?? "smtp.gmail.com";
        _port = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
        _username = config["Smtp:User"];
        _password = config["Smtp:Password"];
        _from = config["Smtp:From"];
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(_from));
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;
        email.Body = new TextPart("plain") { Text = body };

        try
        {
            // Лог в файл
            var logPath = "/app/smtp.log";
            using var logger = new ProtocolLogger(logPath, true);

            using var smtp = new SmtpClient(logger);
            smtp.Timeout = 20000;

            Console.WriteLine($"🔌 Подключаюсь к {_host}:{_port} (STARTTLS)...");

            await smtp.ConnectAsync(_host, _port, SecureSocketOptions.SslOnConnect);

            Console.WriteLine("✅ Подключение установлено, пробую логин...");

            smtp.AuthenticationMechanisms.Remove("XOAUTH2");
            await smtp.AuthenticateAsync(_username, _password);

            Console.WriteLine("🎉 Успешная аутентификация!");

            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);

            Console.WriteLine($"📧 Письмо успешно отправлено на {to}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Ошибка при отправке письма: {ex}");
            throw;
        }
    }
}
