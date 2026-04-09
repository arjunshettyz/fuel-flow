FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Services/Sales/FuelManagement.Sales.API/FuelManagement.Sales.API.csproj", "src/Services/Sales/FuelManagement.Sales.API/"]
COPY ["src/Shared/FuelManagement.Common/FuelManagement.Common.csproj", "src/Shared/FuelManagement.Common/"]
COPY ["src/Shared/FuelManagement.Contracts/FuelManagement.Contracts.csproj", "src/Shared/FuelManagement.Contracts/"]
RUN dotnet restore "src/Services/Sales/FuelManagement.Sales.API/FuelManagement.Sales.API.csproj"
COPY . .
WORKDIR "/src/src/Services/Sales/FuelManagement.Sales.API"
RUN dotnet build "FuelManagement.Sales.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FuelManagement.Sales.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FuelManagement.Sales.API.dll"]
