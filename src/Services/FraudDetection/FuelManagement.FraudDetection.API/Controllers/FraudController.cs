using System.Security.Claims;
using FuelManagement.FraudDetection.API.Data;
using FuelManagement.FraudDetection.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.FraudDetection.API.Controllers;

[ApiController]
[Route("api/fraud")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class FraudController : ControllerBase
{
    private readonly FraudDbContext _context;
    public FraudController(FraudDbContext context) => _context = context;

    /// <summary>Get all fraud alerts with optional filters</summary>
    [HttpGet("alerts")]
    [ProducesResponseType(typeof(List<FraudAlert>), 200)]
    public async Task<IActionResult> GetAlerts(
        [FromQuery] string? severity, [FromQuery] bool? resolved,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.FraudAlerts.AsQueryable();
        if (!string.IsNullOrEmpty(severity)) query = query.Where(a => a.Severity == severity);
        if (resolved.HasValue) query = query.Where(a => a.IsResolved == resolved);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(a => a.DetectedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>Resolve a fraud alert</summary>
    [HttpPut("alerts/{id:guid}/resolve")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveAlertRequest req)
    {
        var alert = await _context.FraudAlerts.FindAsync(id);
        if (alert == null) return NotFound();
        alert.IsResolved = true;
        alert.ResolvedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        alert.ResolvedAt = DateTime.UtcNow;
        alert.ResolutionNotes = req.Notes;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Alert resolved." });
    }

    /// <summary>Get all fraud detection rules</summary>
    [HttpGet("rules")]
    [ProducesResponseType(typeof(List<FraudRule>), 200)]
    public async Task<IActionResult> GetRules()
        => Ok(await _context.FraudRules.ToListAsync());

    /// <summary>Create a new fraud detection rule</summary>
    [HttpPost("rules")]
    [ProducesResponseType(typeof(FraudRule), 201)]
    public async Task<IActionResult> CreateRule([FromBody] CreateRuleRequest req)
    {
        var rule = new FraudRule
        {
            RuleName = req.RuleName, AlertType = req.AlertType,
            Threshold = req.Threshold, Description = req.Description
        };
        _context.FraudRules.Add(rule);
        await _context.SaveChangesAsync();
        return Created($"/api/fraud/rules/{rule.Id}", rule);
    }

    /// <summary>Toggle a fraud rule active/inactive</summary>
    [HttpPut("rules/{id:guid}/toggle")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> ToggleRule(Guid id)
    {
        var rule = await _context.FraudRules.FindAsync(id);
        if (rule == null) return NotFound();
        rule.IsActive = !rule.IsActive;
        await _context.SaveChangesAsync();
        return Ok(new { rule.RuleName, rule.IsActive });
    }

    /// <summary>Analyze a transaction for fraud patterns (inline check)</summary>
    [HttpPost("analyze")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeRequest req)
    {
        var alerts = new List<object>();
        var rules = await _context.FraudRules.Where(r => r.IsActive).ToListAsync();

        foreach (var rule in rules)
        {
            bool triggered = rule.AlertType switch
            {
                "HighVolume" => req.QuantityLitres > rule.Threshold,
                "AfterHours" => req.TransactionHour < 6 || req.TransactionHour > 22,
                "PriceDeviation" => (double)req.UnitPrice > rule.Threshold,
                _ => false
            };

            if (triggered)
            {
                var alert = new FraudAlert
                {
                    TransactionId = req.TransactionId,
                    AlertType = rule.AlertType,
                    Severity = req.QuantityLitres > 500 ? "High" : "Medium",
                    Description = $"Rule '{rule.RuleName}' triggered: {rule.Description}"
                };
                _context.FraudAlerts.Add(alert);
                alerts.Add(new { alert.AlertType, alert.Severity, alert.Description });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { TransactionId = req.TransactionId, AlertsGenerated = alerts.Count, alerts });
    }
}

public record ResolveAlertRequest(string Notes);
public record CreateRuleRequest(string RuleName, string AlertType, double Threshold, string Description);
public record AnalyzeRequest(Guid TransactionId, double QuantityLitres, decimal UnitPrice, int TransactionHour);
