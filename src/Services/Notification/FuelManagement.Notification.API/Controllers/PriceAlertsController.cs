using System.Security.Claims;
using FuelManagement.Notification.API.Data;
using FuelManagement.Notification.API.Models;
using FuelManagement.Notification.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
//j

namespace FuelManagement.Notification.API.Controllers;

[ApiController]
[Route("api/notifications/price-alerts")]
[Authorize]
[Produces("application/json")]
public class PriceAlertsController : ControllerBase
{
    private readonly NotificationDbContext _context;
    private readonly INotificationEmailSender _emailSender;
    private readonly ILogger<PriceAlertsController> _logger;

    public PriceAlertsController(
        NotificationDbContext context,
        INotificationEmailSender emailSender,
        ILogger<PriceAlertsController> logger)
    {
        _context = context;
        _emailSender = emailSender;
        _logger = logger;
    }

    /// <summary>Subscribe to a price drop alert for a fuel type</summary>
    [HttpPost("subscribe")]
    [ProducesResponseType(typeof(PriceDropSubscription), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Subscribe([FromBody] SubscribePriceDropAlertRequest req, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid user identity." });

        var email = (User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email not found in token claims." });

        var fuelType = (req.FuelType ?? "Petrol").Trim();
        if (string.IsNullOrWhiteSpace(fuelType))
            return BadRequest(new { message = "FuelType is required." });

        if (req.TargetPricePerLitre <= 0)
            return BadRequest(new { message = "TargetPricePerLitre must be greater than 0." });

        var target = decimal.Round(req.TargetPricePerLitre, 2, MidpointRounding.AwayFromZero);
        var now = DateTime.UtcNow;

        var existing = await _context.PriceDropSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FuelType == fuelType, cancellationToken);

        if (existing == null)
        {
            existing = new PriceDropSubscription
            {
                UserId = userId,
                Email = email,
                FuelType = fuelType,
                TargetPricePerLitre = target,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.PriceDropSubscriptions.Add(existing);
        }
        else
        {
            existing.Email = email;
            existing.TargetPricePerLitre = target;
            existing.IsActive = true;
            existing.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var subject = $"Fuel Flow: {fuelType} price drop alert subscribed";
        var html = EmailTemplates.RenderPriceDropSubscriptionConfirmation(fuelType, target, now);
        var text = EmailTemplates.RenderPlainTextSubscriptionConfirmation(fuelType, target, now);

        EmailSendResult sendResult;
        try
        {
            sendResult = await _emailSender.SendEmailAsync(email, subject, html, text, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send subscription confirmation mail.");
            sendResult = new EmailSendResult(false, "Failed", ex.Message);
        }

        _context.NotificationLogs.Add(new NotificationLog
        {
            RecipientId = userId.ToString(),
            RecipientContact = email,
            Channel = "Email",
            Subject = subject,
            Message = html,
            Status = sendResult.Status,
            ErrorMessage = sendResult.ErrorMessage,
            CreatedAt = now,
            SentAt = sendResult.Sent ? now : null,
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(existing);
    }

    /// <summary>Get the current user's active price drop subscriptions</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(List<PriceDropSubscription>), 200)]
    public async Task<IActionResult> MySubscriptions(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid user identity." });

        var items = await _context.PriceDropSubscriptions
            .Where(s => s.UserId == userId && s.IsActive)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}

public record SubscribePriceDropAlertRequest(decimal TargetPricePerLitre, string? FuelType = "Petrol");
