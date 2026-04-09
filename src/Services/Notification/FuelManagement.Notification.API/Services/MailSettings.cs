namespace FuelManagement.Notification.API.Services;

public class MailSettings
{
    public bool Enabled { get; set; } = false;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "no-reply@fuel.local";
    public string FromName { get; set; } = "Fuel Management";
}

public record EmailSendResult(bool Sent, string Status, string? ErrorMessage = null);

public interface INotificationEmailSender
{
    Task<EmailSendResult> SendEmailAsync(
        string to,
        string subject,
        string htmlBody,
        string? textBody = null,
        CancellationToken cancellationToken = default);
}
