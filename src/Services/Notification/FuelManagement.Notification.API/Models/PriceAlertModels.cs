namespace FuelManagement.Notification.API.Models;

public class PriceDropSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;

    public string FuelType { get; set; } = "Petrol";
    public decimal TargetPricePerLitre { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastAlertSentAt { get; set; }
    public decimal? LastAlertedPricePerLitre { get; set; }
}
