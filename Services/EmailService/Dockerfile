# Базовый образ для runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Устанавливаем корневые сертификаты
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*
# Возврат к пользователю приложения
USER $APP_UID

# Образ для сборки
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["EmailService.Api/EmailService.Api.csproj", "EmailService.Api/"]
COPY ["EmailService.Infrastructure/EmailService.Infrastructure.csproj", "EmailService.Infrastructure/"]
COPY ["EmailService.Application/EmailService.Application.csproj", "EmailService.Application/"]
COPY ["EmailService.Domain/EmailService.Domain.csproj", "EmailService.Domain/"]
RUN dotnet restore "./EmailService.Api/EmailService.Api.csproj"
COPY . .
WORKDIR "/src/EmailService.Api"
RUN dotnet build "./EmailService.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Публикация
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./EmailService.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Финальный образ
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "EmailService.Api.dll"]
