using BlockService.Api.Extensions;
using BlockService.Services.Extensions;
using BlockService.DataAccess.Extensions;
using BlockService.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerWithAuth();
builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 10 * 1024 * 1024;
});

builder.Services.MigrateDatabase(builder.Configuration);
builder.Services.AddDapper();
builder.Services.AddRepositories();
builder.Services.AddServices();
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddMinioClient(builder.Configuration);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/BlockService/swagger.json", "BlockService API v1"));
app.UseAuthorization();
app.MapControllers();
app.MapHub<BlockHub>("/blockhub");

app.Run();
