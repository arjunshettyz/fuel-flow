namespace FuelManagement.Audit.API.Models;

/// <summary>Immutable audit log — no updates or deletes allowed</summary>
public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;   // Created | Updated | Deleted | Login | Logout | etc.
    public string EntityType { get; set; } = string.Empty;  // User | Transaction | Tank | Station | etc.
    public string EntityId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? OldValues { get; set; }     // JSON
    public string? NewValues { get; set; }     // JSON
    public string ServiceName { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
