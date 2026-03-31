using FuelManagement.Common.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace FuelManagement.Common.Extensions;

public static class ApiDefaultsExtensions
{
    public static IServiceCollection AddFuelManagementApiDefaults(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddHealthChecks();
        return services;
    }

    public static IApplicationBuilder UseFuelManagementApiDefaults(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<GlobalExceptionMiddleware>();
        return app;
    }
}