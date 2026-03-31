using FuelManagement.Notification.API.Data;
using FuelManagement.Notification.API.Models;
using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;

namespace FuelManagement.Notification.API;

public class NotificationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IRabbitMqService _bus;
    private readonly ILogger<NotificationBackgroundService> _logger;

    public NotificationBackgroundService(IServiceProvider serviceProvider, IRabbitMqService bus, ILogger<NotificationBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _bus = bus;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Background Service is starting.");

        // Subscribe to Stock Alerts
        await _bus.SubscribeAsync<StockUpdatedEvent>("stock-updated", async (evt) =>
        {
            if (evt.NewLevel < 1000) // Low stock threshold
            {
                await CreateNotification(evt.StationId.ToString(), "SMS", "Low Stock Alert", $"Fuel level for {evt.FuelType} is low: {evt.NewLevel}L.");
                _logger.LogWarning("Low stock alert created for Station {StationId}", evt.StationId);
            }
        });

        // Subscribe to Fraud Alerts
        await _bus.SubscribeAsync<FraudAlertEvent>("fraud-alerts", async (evt) =>
        {
            await CreateNotification("Admin", "Email", "Fraud Alert", $"Fraud detected: {evt.Description}");
            _logger.LogWarning("Fraud alert notification created.");
        });

        // Subscribe to Sales
        await _bus.SubscribeAsync<SaleRecordedEvent>("sale-recorded", async (evt) =>
        {
            if (evt.TotalAmount > 50000)
            {
                await CreateNotification("Admin", "Email", "High Value Sale Alert", $"Sale of {evt.TotalAmount} recorded at Station {evt.StationId}");
                _logger.LogWarning("Sale notification created for high value transaction.");
            }
        });
    }

    private async Task CreateNotification(string recipient, string channel, string subject, string message)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();

        var log = new NotificationLog
        {
            RecipientId = recipient,
            Channel = channel,
            Subject = subject,
            Message = message,
            Status = "Sent",
            SentAt = DateTime.UtcNow
        };

        context.NotificationLogs.Add(log);
        await context.SaveChangesAsync();
    }
}
