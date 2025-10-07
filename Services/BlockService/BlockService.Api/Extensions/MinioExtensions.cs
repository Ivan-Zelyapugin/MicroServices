using Minio;

namespace BlockService.Api.Extensions
{
    public static class MinioExtensions
    {
        public static IServiceCollection AddMinioClient(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IMinioClient>(sp =>
                new MinioClient()
                    .WithEndpoint(configuration["Minio:Endpoint"])
                    .WithCredentials(configuration["Minio:AccessKey"], configuration["Minio:SecretKey"])
                    .Build());

            return services;
        }
    }
}
