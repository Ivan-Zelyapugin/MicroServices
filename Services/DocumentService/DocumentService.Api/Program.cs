using DocumentService.Api.Extensions;
using DocumentService.Api.GraphQL;
using DocumentService.Api.Hubs;
using DocumentService.DataAccess.Extensions;
using DocumentService.Services.Extensions;
using Prometheus;
using HotChocolate.AspNetCore.Voyager;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerWithAuth();
builder.Services.AddControllers();
builder.Services.AddSignalR();

builder.Services.AddDapper();
builder.Services.AddRepositories();
builder.Services.AddServices();
builder.Services.AddJwtAuth(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", builder =>
    {
        builder.WithOrigins("http://localhost:3000")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .ModifyRequestOptions(opt => opt.IncludeExceptionDetails = true);

var app = builder.Build();

app.UseHttpMetrics();
app.MapMetrics();

app.UseCors("AllowSpecificOrigin");

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/DocumentService/swagger.json", "DocumentService API v1");
    options.RoutePrefix = string.Empty;
});

app.UseAuthorization();

app.MapControllers();
app.MapHub<DocumentHub>("/documenthub");
app.MapHub<ParticipantHub>("/participanthub");

app.MapGraphQL("/graphql");

app.Run();
