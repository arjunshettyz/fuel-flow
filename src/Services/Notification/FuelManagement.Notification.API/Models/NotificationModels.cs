namespace FuelManagement.Notification.API.Models;

public class NotificationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RecipientId { get; set; } = string.Empty;
    public string RecipientContact { get; set; } = string.Empty; // email/phone
    public string Channel { get; set; } = "Email";               // Email | SMS | WhatsApp | Push
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";              // Pending | Sent | Failed
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
}
