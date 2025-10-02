using EmailService.Domain.Interfaces;
using EmailService.Infrastructure.Messaging;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddHostedService<KafkaEmailConsumer>();

var app = builder.Build();

app.UseHttpMetrics();
app.MapMetrics();

app.Run();