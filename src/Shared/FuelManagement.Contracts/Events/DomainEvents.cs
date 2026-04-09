namespace FuelManagement.Contracts.Events;

public record StockUpdatedEvent(
    Guid TankId,
    Guid StationId,
    string FuelType,
    double OldLevel,
    double NewLevel,
    string UpdatedBy,
    DateTime Timestamp);

public record SaleRecordedEvent(
    Guid TransactionId,
    Guid StationId,
    Guid PumpId,
    string FuelType,
    double Quantity,
    decimal TotalAmount,
    string PaymentMethod,
    Guid? CustomerId,
    DateTime Timestamp);

public record FraudAlertEvent(
    Guid AlertId,
    Guid TransactionId,
    string AlertType,
    string Severity,
    string Description,
    DateTime DetectedAt);

public record AuditEvent(
    string EventType,
    string EntityType,
    string EntityId,
    string? UserId,
    string? OldValues,
    string? NewValues,
    string ServiceName,
    DateTime Timestamp);

public record NotificationEvent(
    string RecipientId,
    string Channel,
    string Subject,
    string Message,
    DateTime Timestamp);

public record FuelPriceUpdatedEvent(
    Guid? TankId,
    Guid? StationId,
    string FuelType,
    decimal? OldPricePerLitre,
    decimal NewPricePerLitre,
    string UpdatedBy,
    DateTime Timestamp);
