namespace FuelManagement.Reporting.API.Models;

public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ReportType { get; set; } = string.Empty; // Sales | Inventory | Compliance | Custom
    public string Title { get; set; } = string.Empty;
    public string Format { get; set; } = "PDF";            // PDF | Excel
    public string Status { get; set; } = "Pending";        // Pending | Generating | Completed | Failed
    public string FilePath { get; set; } = string.Empty;
    public string Parameters { get; set; } = "{}";         // JSON serialized params
    public Guid RequestedBy { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
