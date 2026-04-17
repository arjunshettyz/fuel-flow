using System.Net.Mail;
using FuelManagement.Notification.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FuelManagement.Notification.API.Controllers;

[ApiController]
[Route("api/public/contact")]
[AllowAnonymous]
[Produces("application/json")]
public class PublicContactController : ControllerBase
{
    private readonly INotificationEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<PublicContactController> _logger;

    public PublicContactController(
        INotificationEmailSender emailSender,
        IConfiguration configuration,
        IWebHostEnvironment env,
        ILogger<PublicContactController> logger)
    {
        _emailSender = emailSender;
        _configuration = configuration;
        _env = env;
        _logger = logger;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ContactResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Submit([FromBody] ContactRequest req, CancellationToken cancellationToken)
    {
        var name = (req.Name ?? string.Empty).Trim();
        var email = (req.Email ?? string.Empty).Trim();
        var phone = (req.Phone ?? string.Empty).Trim();
        var message = (req.Message ?? string.Empty).Trim();

        if (name.Length < 2 || name.Length > 100)
            return BadRequest(new { message = "Name is required (2-100 characters)." });

        if (!IsValidEmail(email))
            return BadRequest(new { message = "A valid email is required." });

        if (phone.Length > 40)
            return BadRequest(new { message = "Phone must be 40 characters or less." });

        if (message.Length < 10 || message.Length > 4000)
            return BadRequest(new { message = "Message must be 10-4000 characters." });

        var recipient = (_configuration["ContactForm:RecipientEmail"] ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(recipient))
        {
            _logger.LogError("ContactForm recipient email not configured (ContactForm:RecipientEmail). ");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Contact form is not configured." });
        }

        var submittedAtUtc = DateTime.UtcNow;
        var subjectName = SanitizeForSubject(name, 80);
        var subject = $"FuelFlow Contact: {subjectName}";

        var htmlBody = EmailTemplates.RenderContactFormSubmission(name, email, phone, message, submittedAtUtc);
        var textBody = BuildTextBody(name, email, phone, message, submittedAtUtc);

        var result = await _emailSender.SendEmailAsync(recipient, subject, htmlBody, textBody, cancellationToken);
        if (!result.Sent)
        {
            _logger.LogWarning(
                "Contact form email was not sent. Status: {Status}. Error: {Error}",
                result.Status,
                result.ErrorMessage);

            var messageToClient = ResolveMessageToClient(result);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = messageToClient });
        }

        return Ok(new ContactResponse("Received"));
    }

    private string ResolveMessageToClient(EmailSendResult result)
    {
        if (string.Equals(result.ErrorMessage, "Mail delivery disabled.", StringComparison.OrdinalIgnoreCase))
        {
            return "Mail delivery is disabled on the server.";
        }

        if (string.Equals(result.ErrorMessage, "Mail settings incomplete.", StringComparison.OrdinalIgnoreCase))
        {
            return "Mail settings are incomplete on the server.";
        }

        if (_env.IsDevelopment() && !string.IsNullOrWhiteSpace(result.ErrorMessage))
        {
            return $"Message could not be sent right now. (Dev detail: {result.ErrorMessage})";
        }

        return "Message could not be sent right now. Please try again later.";
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
            return false;

        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string SanitizeForSubject(string value, int maxLen)
    {
        var clean = value.Replace("\r", " ").Replace("\n", " ").Trim();
        if (clean.Length <= maxLen)
            return clean;

        return clean[..maxLen].Trim() + "…";
    }

    private static string BuildTextBody(string name, string email, string phone, string message, DateTime submittedAtUtc)
    {
        var phoneLine = string.IsNullOrWhiteSpace(phone) ? "-" : phone;
        return $"New contact form message\n\nName: {name}\nEmail: {email}\nPhone: {phoneLine}\nSubmitted: {submittedAtUtc:O} (UTC)\n\nMessage:\n{message}";
    }
}

public record ContactRequest(string? Name, string? Email, string? Phone, string? Message);

public record ContactResponse(string Status);
