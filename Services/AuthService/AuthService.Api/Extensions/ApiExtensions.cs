using Microsoft.OpenApi.Models;

namespace AuthService.Api.Extensions
{
    public static class ApiExtensions
    {
        public static IServiceCollection AddSwagger(this IServiceCollection services)
        {
            return services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("AuthService", new OpenApiInfo
                {
                    Title = "AuthService API",
                    Version = "v1"
                });
            });
        }
    }
}
