namespace FuelManagement.Identity.API.Models;

public class EmailOtpToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string Purpose { get; set; } = "Register";
    public string CodeHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsConsumed { get; set; } = false;
    public DateTime? VerifiedAt { get; set; }
    public int FailedAttempts { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
