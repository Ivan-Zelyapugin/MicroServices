using AuthService.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Services.Extensions
{
    public static class ServicesExtensions
    {
        public static IServiceCollection AddServices(this IServiceCollection services)
        {
            return services
                .AddScoped<ITokenService, TokenService>()
                .AddScoped<IAuthService, AuthService>()
                .AddScoped<IUserService, UserService>();
        }
    }
}
