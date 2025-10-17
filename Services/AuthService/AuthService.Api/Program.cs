using AuthService.Api.Extensions;
using AuthService.DataAcces.Extensions;
using AuthService.DataAcces.Repositories;
using AuthService.DataAcces.Repositories.Interfaces;
using AuthService.Models;
using AuthService.Models.Interfaces;
using AuthService.Services;
using AuthService.Services.Extensions;
using AuthService.Services.Interfaces;
using StackExchange.Redis;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwagger();
builder.Services.AddControllers();

builder.Services.AddDapper();
builder.Services.AddSingleton<IAuthSettings, AuthSettings>();
builder.Services.AddRepositories();
builder.Services.AddServices();
builder.Services.AddSingleton<IKafkaProducer, KafkaProducer>();
builder.Services.AddScoped<ICodeRepository, RedisCodeRepository>();

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var redisConfig = builder.Configuration.GetSection("Redis");
    string host = redisConfig["Host"];
    string port = redisConfig["Port"];

    var configuration = ConfigurationOptions.Parse($"{host}:{port}");
    configuration.AbortOnConnectFail = false;

    return ConnectionMultiplexer.Connect(configuration);
});


var app = builder.Build();

app.UseHttpMetrics();
app.MapMetrics();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/AuthService/swagger.json", "AuthService API v1");
    options.RoutePrefix = string.Empty;
});

app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => "Hello World!");

app.Run();
