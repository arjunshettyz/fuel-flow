using FuelManagement.Audit.API.Data;
using FuelManagement.Audit.API.Models;
using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;

namespace FuelManagement.Audit.API;

public class AuditBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IRabbitMqService _bus;
    private readonly ILogger<AuditBackgroundService> _logger;

    public AuditBackgroundService(IServiceProvider serviceProvider, IRabbitMqService bus, ILogger<AuditBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _bus = bus;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Audit Background Service is starting.");
        
        await _bus.SubscribeAsync<AuditEvent>("audit-log", async (evt) =>
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
            
            var auditLog = new AuditLog
            {
                EventType = evt.EventType,
                EntityType = evt.EntityType,
                EntityId = evt.EntityId,
                UserId = evt.UserId ?? "System",
                OldValues = evt.OldValues,
                NewValues = evt.NewValues,
                ServiceName = evt.ServiceName,
                Timestamp = evt.Timestamp
            };
            
            context.AuditLogs.Add(auditLog);
            await context.SaveChangesAsync();
            _logger.LogInformation("Audit log recorded for {EntityType} {EntityId}", evt.EntityType, evt.EntityId);
        });
    }
}
