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

    public static string Normalize(string? purpose)
    {
        var value = (purpose ?? string.Empty).Trim();
        if (value.Equals(Login, StringComparison.OrdinalIgnoreCase))
        {
            return Login;
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
    public string FromName { get; set; } = "Fuel Management";
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
            message.Subject = $"Fuel Management {purpose} OTP";

            message.Body = new TextPart("plain")
            {
                Text = $"Your Fuel Management OTP is {otp}. It expires in {_otpSettings.ExpiryMinutes} minutes."
            };

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

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
