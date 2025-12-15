using Confluent.Kafka;
using EmailService.Application.Events;
using EmailService.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System.Text.Json;

namespace EmailService.Infrastructure.Messaging
{
    public class KafkaEmailConsumer : BackgroundService
    {
        private readonly IConsumer<string, string> _consumer;
        private readonly IEmailSender _emailSender;
        private readonly string _topic;

        public KafkaEmailConsumer(IConfiguration config, IEmailSender emailSender)
        {
            var consumerConfig = new ConsumerConfig
            {
                BootstrapServers = config["Kafka:BootstrapServers"] ?? "kafka:9092",
                GroupId = "email-service",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = true
            };

            _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
            _topic = config["Kafka:Topics:SendEmailCode"] ?? "send-email-code";
            _emailSender = emailSender;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);

            return Task.CompletedTask;
        }

        private async Task ConsumeLoop(CancellationToken stoppingToken)
        {
            _consumer.Subscribe(_topic);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var cr = _consumer.Consume(stoppingToken);

                    if (cr?.Message?.Value == null)
                        continue;

                    var evt = JsonSerializer.Deserialize<SendEmailCodeEvent>(cr.Message.Value);

                    if (evt != null)
                    {
                        try
                        {
                            await _emailSender.SendAsync(
                                evt.Email,
                                "Подтверждение Email",
                                $"Ваш код подтверждения: {evt.Code}"
                            );

                            Console.WriteLine($"Код {evt.Code} отправлен на {evt.Email}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Ошибка при отправке письма: {ex.Message}");
                        }
                    }
                }
                catch (ConsumeException ex)
                {
                    Console.WriteLine($"Kafka consume error: {ex.Error.Reason}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ошибка при обработке сообщения: {ex.Message}");
                }
            }
        }

        public override void Dispose()
        {
            _consumer.Close();
            _consumer.Dispose();
            base.Dispose();
        }
    }
}
