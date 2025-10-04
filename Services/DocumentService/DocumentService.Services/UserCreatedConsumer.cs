using Confluent.Kafka;
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;

namespace DocumentService.Services
{
    public class KafkaUserConsumer : BackgroundService
    {
        private readonly IConsumer<string, string> _consumer;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly string _topic;

        public KafkaUserConsumer(IConfiguration config, IServiceScopeFactory scopeFactory)
        {
            var consumerConfig = new ConsumerConfig
            {
                BootstrapServers = config["Kafka:BootstrapServers"] ?? "kafka:9092",
                GroupId = "document-service-users",
                AutoOffsetReset = AutoOffsetReset.Earliest
            };

            _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
            _topic = config["Kafka:Topics:UserCreated"] ?? "user-created";
            _scopeFactory = scopeFactory;
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // ⚡ Запускаем цикл в отдельном фоне
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

                    var evt = JsonSerializer.Deserialize<UserCreatedEvent>(cr.Message.Value);

                    if (evt != null)
                    {
                        try
                        {
                            Console.WriteLine("Id = " + evt.Id);
                            Console.WriteLine("Email = " + evt.Email);
                            using var scope = _scopeFactory.CreateScope();
                            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

                            await userRepository.CreateUser(new DbUser
                            {
                                Id = evt.Id,
                                Email = evt.Email
                            });

                            Console.WriteLine($"✅ Пользователь {evt.Id} ({evt.Email}) добавлен/обновлён в DocumentService");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"❌ Ошибка при добавлении пользователя: {ex.Message}");
                        }
                    }
                }
                catch (ConsumeException ex)
                {
                    Console.WriteLine($"Kafka consume error: {ex.Error.Reason}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ошибка при обработке Kafka сообщения: {ex.Message}");
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
