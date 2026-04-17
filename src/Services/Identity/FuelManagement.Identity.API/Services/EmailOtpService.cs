using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using System.Security.Cryptography;
using FuelManagement.Identity.API.Data;
using FuelManagement.Identity.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FuelManagement.Identity.API.Services;

public static class MailOtpPurposes
{
    public const string Register = "Register";
    public const string Login = "Login";
    public const string ForgotPassword = "ForgotPassword";

    public static string Normalize(string? purpose)
    {
        var value = (purpose ?? string.Empty).Trim();
        if (value.Equals(Login, StringComparison.OrdinalIgnoreCase))
        {
            return Login;
        }

        if (value.Equals(ForgotPassword, StringComparison.OrdinalIgnoreCase))
        {
            return ForgotPassword;
        }

        return Register;
    }
}

public class OtpSettings
{
    public int ExpiryMinutes { get; set; } = 10;
    public int MaxAttempts { get; set; } = 5;
}

public class MailSettings
{
    public bool Enabled { get; set; } = false;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "no-reply@fuel.local";
    public string FromName { get; set; } = "Fuel Flow";
}

public record SendEmailOtpResult(string Message, int ExpiresInSeconds, string? DevOtpCode = null);

public record VerifyEmailOtpResult(bool Verified, string Message);

public class EmailOtpService
{
    private readonly IdentityDbContext _context;
    private readonly OtpSettings _otpSettings;
    private readonly MailSettings _mailSettings;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<EmailOtpService> _logger;

    public EmailOtpService(
        IdentityDbContext context,
        IOptions<OtpSettings> otpOptions,
        IOptions<MailSettings> mailOptions,
        IWebHostEnvironment env,
        ILogger<EmailOtpService> logger)
    {
        _context = context;
        _otpSettings = otpOptions.Value;
        _mailSettings = mailOptions.Value;
        _env = env;
        _logger = logger;
    }

    public async Task<SendEmailOtpResult> SendOtpAsync(string email, string purpose, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var normalizedPurpose = MailOtpPurposes.Normalize(purpose);
        var now = DateTime.UtcNow;

        var existingTokens = await _context.EmailOtpTokens
            .Where(t => t.Email == normalizedEmail && t.Purpose == normalizedPurpose && !t.IsConsumed)
            .ToListAsync(cancellationToken);

        foreach (var existing in existingTokens)
        {
            existing.IsConsumed = true;
        }

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        var token = new EmailOtpToken
        {
            Email = normalizedEmail,
            Purpose = normalizedPurpose,
            CodeHash = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = now.AddMinutes(_otpSettings.ExpiryMinutes),
            CreatedAt = now
        };

        _context.EmailOtpTokens.Add(token);
        await _context.SaveChangesAsync(cancellationToken);

        var emailSent = await SendOtpEmailAsync(normalizedEmail, otp, normalizedPurpose);

        var devOtpCode = !emailSent && _env.IsDevelopment() ? otp : null;
        var message = emailSent
            ? "OTP sent to your email address."
            : "Mail delivery is unavailable. OTP is logged in Identity API output.";

        return new SendEmailOtpResult(message, _otpSettings.ExpiryMinutes * 60, devOtpCode);
    }

    public async Task<VerifyEmailOtpResult> VerifyOtpAsync(
        string email,
        string otp,
        string purpose,
        bool consumeOnSuccess,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var normalizedPurpose = MailOtpPurposes.Normalize(purpose);

        var token = await _context.EmailOtpTokens
            .Where(t => t.Email == normalizedEmail && t.Purpose == normalizedPurpose && !t.IsConsumed)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (token == null)
        {
            return new VerifyEmailOtpResult(false, "OTP not found. Please request a new code.");
        }

        if (token.ExpiresAt <= DateTime.UtcNow)
        {
            token.IsConsumed = true;
            await _context.SaveChangesAsync(cancellationToken);
            return new VerifyEmailOtpResult(false, "OTP expired. Please request a new code.");
        }

        if (token.FailedAttempts >= _otpSettings.MaxAttempts)
        {
            token.IsConsumed = true;
            await _context.SaveChangesAsync(cancellationToken);
            return new VerifyEmailOtpResult(false, "Too many invalid attempts. Request a new OTP.");
        }

        if (!BCrypt.Net.BCrypt.Verify(otp, token.CodeHash))
        {
            token.FailedAttempts += 1;
            if (token.FailedAttempts >= _otpSettings.MaxAttempts)
            {
                token.IsConsumed = true;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return new VerifyEmailOtpResult(false, "Invalid OTP.");
        }

        token.IsVerified = true;
        token.VerifiedAt = DateTime.UtcNow;
        if (consumeOnSuccess)
        {
            token.IsConsumed = true;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return new VerifyEmailOtpResult(true, "OTP verified successfully.");
    }

    public async Task<bool> ConsumeVerifiedOtpAsync(string email, string purpose, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var normalizedPurpose = MailOtpPurposes.Normalize(purpose);

        var token = await _context.EmailOtpTokens
            .Where(t =>
                t.Email == normalizedEmail &&
                t.Purpose == normalizedPurpose &&
                t.IsVerified &&
                !t.IsConsumed &&
                t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.VerifiedAt ?? t.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (token == null)
        {
            return false;
        }

        token.IsConsumed = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> SendOtpEmailAsync(string email, string otp, string purpose)
    {
        if (!_mailSettings.Enabled || string.IsNullOrWhiteSpace(_mailSettings.SmtpHost))
        {
            _logger.LogInformation("[MAIL_OTP] {Purpose} OTP for {Email}: {Otp}", purpose, email, otp);
            return false;
        }

        var smtpUsername = string.IsNullOrWhiteSpace(_mailSettings.Username)
            ? _mailSettings.FromEmail
            : _mailSettings.Username;

        if (string.IsNullOrWhiteSpace(_mailSettings.FromEmail) ||
            string.IsNullOrWhiteSpace(smtpUsername) ||
            string.IsNullOrWhiteSpace(_mailSettings.Password))
        {
            _logger.LogWarning(
                "Mail settings incomplete for OTP delivery. Configure MailSettings:FromEmail, Username (or FromEmail), and Password. Falling back to logged OTP.");
            _logger.LogInformation("[MAIL_OTP] {Purpose} OTP for {Email}: {Otp}", purpose, email, otp);
            return false;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_mailSettings.FromName, _mailSettings.FromEmail));
            message.To.Add(new MailboxAddress("", email));
            message.Subject = $"Fuel Flow {purpose} OTP";

            var htmlBody = RenderOtpHtmlBody(otp, purpose, _otpSettings.ExpiryMinutes);
            var textBody = $"Your Fuel Flow OTP is {otp}. It expires in {_otpSettings.ExpiryMinutes} minutes.";

            var builder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = textBody,
            };

            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            
            var secureSocketOptions = _mailSettings.UseSsl 
                ? SecureSocketOptions.StartTls 
                : SecureSocketOptions.Auto;

            await client.ConnectAsync(_mailSettings.SmtpHost, _mailSettings.SmtpPort, secureSocketOptions);
            await client.AuthenticateAsync(smtpUsername, _mailSettings.Password);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP email to {Email}", email);
            _logger.LogInformation("[MAIL_OTP] {Purpose} OTP for {Email}: {Otp}", purpose, email, otp);
            return false;
        }
    }

    private static string RenderOtpHtmlBody(string otp, string purpose, int expiryMinutes)
    {
        const string accent = "#18b8b0";
        const string accentDark = "#0f8f88";
        const string ink = "#0f161c";
        const string muted = "#5b636c";
        const string paper = "#ffffff";
        const string border = "#d6dde2";
        const string backdrop = "#eef3f6";

        var safePurpose = System.Net.WebUtility.HtmlEncode(purpose);

        return $@"<!doctype html>
<html lang=""en"">
<head>
    <meta charset=""utf-8"" />
    <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
    <title>Fuel Flow OTP</title>
</head>
<body style=""margin:0;padding:0;background:{backdrop};"">
    <div style=""display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"">Fuel Flow OTP</div>

    <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background:{backdrop};padding:24px 12px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""600"" cellspacing=""0"" cellpadding=""0"" style=""max-width:600px;width:100%;"">
                    <tr>
                        <td style=""padding:0 0 14px 0;"">
                            <div style=""display:flex;align-items:center;gap:10px;"">
                                <div style=""width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,{accent},{accentDark});""></div>
                                <div>
                                    <div style=""font-weight:900;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:{muted};"">Fuel Flow</div>
                                    <div style=""font-weight:700;font-size:12px;color:{muted};"">Secure sign-in verification</div>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style=""background:{paper};border:1px solid {border};border-radius:20px;box-shadow:0 10px 26px rgba(16,25,32,0.08);padding:22px;"">
                            <h1 style=""margin:0;font-size:22px;line-height:1.25;color:{ink};"">Your OTP code</h1>
                            <p style=""margin:10px 0 0;color:{muted};font-size:14px;"">Use this code to complete <strong>{safePurpose}</strong>. It expires in {expiryMinutes} minutes.</p>

                            <div style=""margin:18px 0 0;border:1px solid {border};border-radius:16px;background:{paper};padding:16px;text-align:center;"">
                                <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{muted};font-weight:700;"">One-time password</div>
                                <div style=""margin-top:10px;font-size:34px;font-weight:900;letter-spacing:0.22em;color:{ink};"">{otp}</div>
                            </div>

                            <div style=""margin:18px 0 0;border-radius:14px;background:rgba(24,184,176,0.10);border:1px solid rgba(24,184,176,0.25);padding:14px;"">
                                <div style=""font-weight:800;color:{ink};"">Didn’t request this?</div>
                                <div style=""margin-top:6px;color:{muted};font-size:13px;"">You can ignore this email. Do not share this code with anyone.</div>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style=""padding:14px 4px 0 4px;color:{muted};font-size:12px;line-height:1.5;"">
                            This is an automated message from Fuel Flow.
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
