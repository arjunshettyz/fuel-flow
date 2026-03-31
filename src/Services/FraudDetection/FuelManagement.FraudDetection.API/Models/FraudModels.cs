namespace FuelManagement.FraudDetection.API.Models;

public class FraudAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TransactionId { get; set; }
    public string AlertType { get; set; } = string.Empty;   // HighVolume | AfterHours | PriceDeviation | DuplicateTransaction
    public string Severity { get; set; } = "Medium";        // Low | Medium | High | Critical
    public string Description { get; set; } = string.Empty;
    public bool IsResolved { get; set; } = false;
    public string? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
}

public class FraudRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RuleName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public double Threshold { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
