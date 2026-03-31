FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/Services/Reporting/FuelManagement.Reporting.API/FuelManagement.Reporting.API.csproj", "src/Services/Reporting/FuelManagement.Reporting.API/"]
COPY ["src/Shared/FuelManagement.Common/FuelManagement.Common.csproj", "src/Shared/FuelManagement.Common/"]
COPY ["src/Shared/FuelManagement.Contracts/FuelManagement.Contracts.csproj", "src/Shared/FuelManagement.Contracts/"]
RUN dotnet restore "src/Services/Reporting/FuelManagement.Reporting.API/FuelManagement.Reporting.API.csproj"
COPY . .
WORKDIR "/src/src/Services/Reporting/FuelManagement.Reporting.API"
RUN dotnet build "FuelManagement.Reporting.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FuelManagement.Reporting.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FuelManagement.Reporting.API.dll"]
