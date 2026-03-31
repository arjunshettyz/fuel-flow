using FuelManagement.Notification.API.Data;
using FuelManagement.Notification.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Notification.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
[Produces("application/json")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationDbContext _context;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(NotificationDbContext context, ILogger<NotificationsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Send a notification manually</summary>
    [HttpPost("send")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(NotificationLog), 200)]
    public async Task<IActionResult> Send([FromBody] SendNotificationRequest req)
    {
        var log = new NotificationLog
        {
            RecipientId = req.RecipientId,
            RecipientContact = req.RecipientContact,
            Channel = req.Channel,
            Subject = req.Subject,
            Message = req.Message
        };

        try
        {
            // Dispatch based on channel (stub implementations)
            switch (req.Channel.ToUpper())
            {
                case "EMAIL":
                    await DispatchEmailAsync(req.RecipientContact, req.Subject, req.Message);
                    break;
                case "SMS":
                    await DispatchSmsAsync(req.RecipientContact, req.Message);
                    break;
                case "WHATSAPP":
                    await DispatchWhatsAppAsync(req.RecipientContact, req.Message);
                    break;
                case "PUSH":
                    await DispatchPushAsync(req.RecipientId, req.Subject, req.Message);
                    break;
                default:
                    return BadRequest(new { message = "Invalid channel. Use: Email, SMS, WhatsApp, Push" });
            }
            log.Status = "Sent";
            log.SentAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification.");
            log.Status = "Failed";
            log.ErrorMessage = ex.Message;
        }

        _context.NotificationLogs.Add(log);
        await _context.SaveChangesAsync();
        return Ok(log);
    }

    /// <summary>Get notification history with filters</summary>
    [HttpGet("logs")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(List<NotificationLog>), 200)]
    public async Task<IActionResult> Logs(
        [FromQuery] string? channel, [FromQuery] string? status,
        [FromQuery] string? recipientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.NotificationLogs.AsQueryable();
        if (!string.IsNullOrEmpty(channel)) query = query.Where(n => n.Channel == channel);
        if (!string.IsNullOrEmpty(status)) query = query.Where(n => n.Status == status);
        if (!string.IsNullOrEmpty(recipientId)) query = query.Where(n => n.RecipientId == recipientId);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    // Stub dispatch methods — replace with real SDK calls
    private Task DispatchEmailAsync(string to, string subject, string body)
    {
        _logger.LogInformation("[EMAIL] To: {To} | Subject: {Subject}", to, subject);
        return Task.CompletedTask; // TODO: Use SendGrid/SMTP
    }

    private Task DispatchSmsAsync(string phone, string message)
    {
        _logger.LogInformation("[SMS] To: {Phone} | Message: {Message}", phone, message);
        return Task.CompletedTask; // TODO: Use Twilio
    }

    private Task DispatchWhatsAppAsync(string phone, string message)
    {
        _logger.LogInformation("[WHATSAPP] To: {Phone} | Message: {Message}", phone, message);
        return Task.CompletedTask; // TODO: Use WhatsApp Business API
    }

    private Task DispatchPushAsync(string userId, string title, string body)
    {
        _logger.LogInformation("[PUSH] UserId: {UserId} | Title: {Title}", userId, title);
        return Task.CompletedTask; // TODO: Use Firebase FCM
    }
}

public record SendNotificationRequest(
    string RecipientId,
    string RecipientContact,
    string Channel,
    string Subject,
    string Message);
