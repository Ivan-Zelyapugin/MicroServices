# См. статью по ссылке https://aka.ms/customizecontainer, чтобы узнать как настроить контейнер отладки и как Visual Studio использует этот Dockerfile для создания образов для ускорения отладки.

# Этот этап используется при запуске из VS в быстром режиме (по умолчанию для конфигурации отладки)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# Этот этап используется для сборки проекта службы
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["BlockService.Api/BlockService.Api.csproj", "BlockService.Api/"]
COPY ["BlockService.Services/BlockService.Services.csproj", "BlockService.Services/"]
COPY ["BlockService.Common/BlockService.Common.csproj", "BlockService.Common/"]
COPY ["BlockService.DataAccess/BlockService.DataAccess.csproj", "BlockService.DataAccess/"]
COPY ["BlockService.Models/BlockService.Models.csproj", "BlockService.Models/"]
RUN dotnet restore "./BlockService.Api/BlockService.Api.csproj"
COPY . .
WORKDIR "/src/BlockService.Api"
RUN dotnet build "./BlockService.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Этот этап используется для публикации проекта службы, который будет скопирован на последний этап
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./BlockService.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Этот этап используется в рабочей среде или при запуске из VS в обычном режиме (по умолчанию, когда конфигурация отладки не используется)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BlockService.Api.dll"]