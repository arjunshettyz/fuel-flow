using FuelManagement.Audit.API.Data;
using FuelManagement.Audit.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Audit.API.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AuditController : ControllerBase
{
    private readonly AuditDbContext _context;
    public AuditController(AuditDbContext context) => _context = context;

    /// <summary>Query the system-wide audit trail (Admin only)</summary>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(List<AuditLog>), 200)]
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? eventType, [FromQuery] string? entityType,
        [FromQuery] string? userId, [FromQuery] string? serviceName,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.AuditLogs.AsQueryable();
        if (!string.IsNullOrEmpty(eventType)) query = query.Where(l => l.EventType == eventType);
        if (!string.IsNullOrEmpty(entityType)) query = query.Where(l => l.EntityType == entityType);
        if (!string.IsNullOrEmpty(userId)) query = query.Where(l => l.UserId == userId);
        if (!string.IsNullOrEmpty(serviceName)) query = query.Where(l => l.ServiceName == serviceName);
        if (from.HasValue) query = query.Where(l => l.Timestamp >= from);
        if (to.HasValue) query = query.Where(l => l.Timestamp <= to);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>Get complete audit history for a specific entity</summary>
    [HttpGet("logs/{entityId}")]
    [ProducesResponseType(typeof(List<AuditLog>), 200)]
    public async Task<IActionResult> GetEntityHistory(string entityId, [FromQuery] string? entityType)
    {
        var query = _context.AuditLogs.Where(l => l.EntityId == entityId);
        if (!string.IsNullOrEmpty(entityType)) query = query.Where(l => l.EntityType == entityType);
        return Ok(await query.OrderByDescending(l => l.Timestamp).ToListAsync());
    }

    /// <summary>Write an audit event (called by other services or via Gateway)</summary>
    [HttpPost("logs")]
    [ProducesResponseType(typeof(AuditLog), 201)]
    public async Task<IActionResult> Write([FromBody] WriteAuditRequest req)
    {
        var log = new AuditLog
        {
            EventType = req.EventType, EntityType = req.EntityType,
            EntityId = req.EntityId, UserId = req.UserId,
            OldValues = req.OldValues, NewValues = req.NewValues,
            ServiceName = req.ServiceName,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
        };
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
        return Created($"/api/audit/logs/{log.EntityId}", log);
    }
}

public record WriteAuditRequest(
    string EventType, string EntityType, string EntityId,
    string? UserId, string? OldValues, string? NewValues, string ServiceName);
