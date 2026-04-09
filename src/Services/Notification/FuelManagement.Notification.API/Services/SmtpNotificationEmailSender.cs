using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace FuelManagement.Notification.API.Services;

public class SmtpNotificationEmailSender : INotificationEmailSender
{
    private readonly MailSettings _mailSettings;
    private readonly ILogger<SmtpNotificationEmailSender> _logger;

    public SmtpNotificationEmailSender(IOptions<MailSettings> mailOptions, ILogger<SmtpNotificationEmailSender> logger)
    {
        _mailSettings = mailOptions.Value;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendEmailAsync(
        string to,
        string subject,
        string htmlBody,
        string? textBody = null,
        CancellationToken cancellationToken = default)
    {
        if (!_mailSettings.Enabled || string.IsNullOrWhiteSpace(_mailSettings.SmtpHost))
        {
            _logger.LogInformation("[MAIL_DISABLED] To: {To} | Subject: {Subject}\n{Body}", to, subject, textBody ?? "(html omitted)");
            return new EmailSendResult(false, "Skipped", "Mail delivery disabled.");
        }

        var smtpUsername = string.IsNullOrWhiteSpace(_mailSettings.Username)
            ? _mailSettings.FromEmail
            : _mailSettings.Username;

        if (string.IsNullOrWhiteSpace(_mailSettings.FromEmail) ||
            string.IsNullOrWhiteSpace(smtpUsername) ||
            string.IsNullOrWhiteSpace(_mailSettings.Password))
        {
            _logger.LogWarning(
                "Mail settings incomplete. Configure MailSettings:FromEmail, Username (or FromEmail), and Password. Skipping mail delivery.");
            return new EmailSendResult(false, "Failed", "Mail settings incomplete.");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_mailSettings.FromName, _mailSettings.FromEmail));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = string.IsNullOrWhiteSpace(textBody) ? null : textBody,
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();

            var secureSocketOptions = _mailSettings.UseSsl
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.Auto;

            await client.ConnectAsync(_mailSettings.SmtpHost, _mailSettings.SmtpPort, secureSocketOptions, cancellationToken);
            await client.AuthenticateAsync(smtpUsername, _mailSettings.Password, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
            return new EmailSendResult(true, "Sent");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            return new EmailSendResult(false, "Failed", ex.Message);
        }
    }
}
