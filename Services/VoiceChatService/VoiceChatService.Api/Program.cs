using VoiceChatService.Api.Extensions;
using VoiceChatService.Api.Hubs;
using VoiceChatService.Application.Extensions;
using VoiceChatService.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddApplication();

builder.Services.AddSignalR();

builder.Services.AddJwtAuth(builder.Configuration);

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapHub<VoiceChatHub>("/voice");

app.MapGet("/", () => "Hello World!");

app.Run();
