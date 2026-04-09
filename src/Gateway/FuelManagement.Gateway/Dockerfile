FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Gateway/FuelManagement.Gateway/FuelManagement.Gateway.csproj", "src/Gateway/FuelManagement.Gateway/"]
COPY ["src/Shared/FuelManagement.Common/FuelManagement.Common.csproj", "src/Shared/FuelManagement.Common/"]
COPY ["src/Shared/FuelManagement.Contracts/FuelManagement.Contracts.csproj", "src/Shared/FuelManagement.Contracts/"]
RUN dotnet restore "src/Gateway/FuelManagement.Gateway/FuelManagement.Gateway.csproj"
COPY . .
WORKDIR "/src/src/Gateway/FuelManagement.Gateway"
RUN dotnet build "FuelManagement.Gateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FuelManagement.Gateway.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FuelManagement.Gateway.dll"]
