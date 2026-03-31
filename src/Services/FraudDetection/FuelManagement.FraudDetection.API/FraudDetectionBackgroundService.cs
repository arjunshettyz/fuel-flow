using FuelManagement.FraudDetection.API.Data;
using FuelManagement.FraudDetection.API.Models;
using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;

namespace FuelManagement.FraudDetection.API;

public class FraudDetectionBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IRabbitMqService _bus;
    private readonly ILogger<FraudDetectionBackgroundService> _logger;

    public FraudDetectionBackgroundService(IServiceProvider serviceProvider, IRabbitMqService bus, ILogger<FraudDetectionBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _bus = bus;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Fraud Detection Background Service is starting.");

        await _bus.SubscribeAsync<SaleRecordedEvent>("sale-recorded", async (evt) =>
        {
            _logger.LogInformation("Analysis started for Transaction {TransactionId}", evt.TransactionId);
            
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FraudDbContext>();

            var rules = context.FraudRules.Where(r => r.IsActive).ToList();

            foreach (var rule in rules)
            {
                var unitPrice = evt.Quantity > 0 ? (double)(evt.TotalAmount / (decimal)evt.Quantity) : 0;
                var transactionHour = evt.Timestamp.ToLocalTime().Hour;

                bool triggered = rule.AlertType switch
                {
                    "HighVolume" => evt.Quantity > rule.Threshold,
                    "AfterHours" => transactionHour < 6 || transactionHour > 22,
                    "PriceDeviation" => unitPrice > rule.Threshold,
                    _ => false
                };

                if (triggered)
                {
                    var alert = new FraudAlert
                    {
                        TransactionId = evt.TransactionId,
                        AlertType = rule.AlertType,
                        Severity = evt.Quantity > 500 ? "High" : "Medium",
                        Description = $"Rule '{rule.RuleName}' triggered: {rule.Description}",
                        IsResolved = false,
                        DetectedAt = DateTime.UtcNow
                    };

                    context.FraudAlerts.Add(alert);
                    await context.SaveChangesAsync();
                    
                    // Publish Fraud Alert Event
                    var alertEvent = new FraudAlertEvent(alert.Id, alert.TransactionId, alert.AlertType, alert.Severity, alert.Description, DateTime.UtcNow);
                    await _bus.PublishAsync("fraud-alerts", alertEvent);
                    
                    _logger.LogWarning("Fraud detected! Rule: {RuleName}, Transaction: {TransactionId}", rule.RuleName, evt.TransactionId);
                }
            }
        });
    }
}
