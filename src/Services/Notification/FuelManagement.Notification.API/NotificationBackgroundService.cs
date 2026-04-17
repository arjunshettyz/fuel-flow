using FuelManagement.Notification.API.Data;
using FuelManagement.Notification.API.Models;
using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;
using FuelManagement.Notification.API.Services;
using Microsoft.EntityFrameworkCore;

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
        try
        {
            await _bus.SubscribeAsync<StockUpdatedEvent>("stock-updated", async (evt) =>
            {
                if (evt.NewLevel < 1000) // Low stock threshold
                {
                    await CreateNotification(evt.StationId.ToString(), "SMS", "Low Stock Alert", $"Fuel level for {evt.FuelType} is low: {evt.NewLevel}L.");
                    _logger.LogWarning("Low stock alert created for Station {StationId}", evt.StationId);
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to 'stock-updated'. RabbitMQ may be unavailable.");
        }

        // Subscribe to Fraud Alerts
        try
        {
            await _bus.SubscribeAsync<FraudAlertEvent>("fraud-alerts", async (evt) =>
            {
                await CreateNotification("Admin", "Email", "Fraud Alert", $"Fraud detected: {evt.Description}");
                _logger.LogWarning("Fraud alert notification created.");
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to 'fraud-alerts'. RabbitMQ may be unavailable.");
        }

        // Subscribe to Sales
        try
        {
            await _bus.SubscribeAsync<SaleRecordedEvent>("sale-recorded", async (evt) =>
            {
                if (evt.TotalAmount > 50000)
                {
                    await CreateNotification("Admin", "Email", "High Value Sale Alert", $"Sale of {evt.TotalAmount} recorded at Station {evt.StationId}");
                    _logger.LogWarning("Sale notification created for high value transaction.");
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to 'sale-recorded'. RabbitMQ may be unavailable.");
        }

        // Subscribe to Fuel Price Updates (Price Drop Alerts)
        try
        {
            await _bus.SubscribeAsync<FuelPriceUpdatedEvent>("fuel-price-updated", async (evt) =>
            {
                if (string.IsNullOrWhiteSpace(evt.FuelType))
                    return;

                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
                var emailSender = scope.ServiceProvider.GetRequiredService<INotificationEmailSender>();

                var now = DateTime.UtcNow;
                var fuelType = evt.FuelType.Trim();

                var subscriptions = await context.PriceDropSubscriptions
                    .Where(s => s.IsActive && s.FuelType == fuelType)
                    .ToListAsync();

                foreach (var sub in subscriptions)
                {
                    if (evt.NewPricePerLitre > sub.TargetPricePerLitre)
                        continue;

                    var shouldAlert = false;

                    if (sub.LastAlertSentAt == null || sub.LastAlertedPricePerLitre == null)
                    {
                        shouldAlert = true;
                    }
                    else
                    {
                        var previousPrice = evt.OldPricePerLitre ?? sub.LastAlertedPricePerLitre;
                        if (previousPrice.HasValue)
                        {
                            shouldAlert = previousPrice.Value > sub.TargetPricePerLitre;
                        }
                    }

                    if (!shouldAlert)
                        continue;

                    var subject = $"Fuel Flow: {fuelType} price dropped below your target";
                    var html = EmailTemplates.RenderPriceDropAlert(
                        fuelType,
                        sub.TargetPricePerLitre,
                        evt.NewPricePerLitre,
                        evt.OldPricePerLitre,
                        evt.StationId,
                        evt.Timestamp);
                    var text = EmailTemplates.RenderPlainTextPriceDropAlert(
                        fuelType,
                        sub.TargetPricePerLitre,
                        evt.NewPricePerLitre,
                        evt.OldPricePerLitre,
                        evt.StationId,
                        evt.Timestamp);

                    var sendResult = await emailSender.SendEmailAsync(sub.Email, subject, html, text);

                    context.NotificationLogs.Add(new NotificationLog
                    {
                        RecipientId = sub.UserId.ToString(),
                        RecipientContact = sub.Email,
                        Channel = "Email",
                        Subject = subject,
                        Message = html,
                        Status = sendResult.Status,
                        ErrorMessage = sendResult.ErrorMessage,
                        CreatedAt = now,
                        SentAt = sendResult.Sent ? now : null,
                    });

                    if (sendResult.Sent)
                    {
                        sub.LastAlertSentAt = now;
                        sub.LastAlertedPricePerLitre = evt.NewPricePerLitre;
                        sub.UpdatedAt = now;
                    }
                }

                await context.SaveChangesAsync();
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to 'fuel-price-updated'. RabbitMQ may be unavailable.");
        }
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
        try
        {
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist notification log (DB may be unavailable).");
        }
    }
}
