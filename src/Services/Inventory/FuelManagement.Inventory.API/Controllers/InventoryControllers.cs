using System.Security.Claims;
using FuelManagement.Inventory.API.Data;
using FuelManagement.Inventory.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System.Text.Json;
using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;

namespace FuelManagement.Inventory.API.Controllers;

[ApiController]
[Route("api/tanks")]
[Authorize]
[Produces("application/json")]
public class TanksController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly IDatabase? _redis;
    private readonly IRabbitMqService _bus;

    public TanksController(InventoryDbContext context, IConnectionMultiplexer? redis = null, IRabbitMqService bus = null!)
    {
        _context = context;
        _redis = redis?.GetDatabase();
        _bus = bus;
    }

    /// <summary>Get all fuel tanks with optional station filter</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<FuelTank>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? stationId, [FromQuery] string? fuelType)
    {
        var cacheKey = $"tanks:{stationId}:{fuelType}";
        if (_redis != null)
        {
            var cached = await _redis.StringGetAsync(cacheKey);
            if (cached.HasValue)
                return Ok(System.Text.Json.JsonSerializer.Deserialize<object>((string)cached!));
        }

        var query = _context.Tanks.AsQueryable();
        if (stationId.HasValue) query = query.Where(t => t.StationId == stationId);
        if (!string.IsNullOrEmpty(fuelType)) query = query.Where(t => t.FuelType == fuelType);

        var tanks = await query.ToListAsync();

        if (_redis != null)
            await _redis.StringSetAsync(cacheKey, JsonSerializer.Serialize(tanks), TimeSpan.FromMinutes(5));

        return Ok(tanks);
    }

    /// <summary>Compatibility alias for list-style clients.</summary>
    [HttpGet("list")]
    [ProducesResponseType(typeof(List<FuelTank>), 200)]
    public Task<IActionResult> List([FromQuery] Guid? stationId, [FromQuery] string? fuelType)
        => GetAll(stationId, fuelType);

    /// <summary>Get current fuel prices grouped by fuel type</summary>
    [HttpGet("prices")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> GetCurrentPrices()
    {
        var tanks = await _context.Tanks
            .AsNoTracking()
            .Where(t => t.IsActive)
            .ToListAsync();

        var items = tanks
            .GroupBy(t => t.FuelType)
            .Select(g =>
            {
                var latest = g.OrderByDescending(t => t.LastUpdated).First();
                return new
                {
                    fuelType = latest.FuelType,
                    pricePerLitre = latest.PricePerLitre,
                    updatedAt = latest.LastUpdated,
                };
            })
            .OrderBy(x => x.fuelType)
            .ToList();

        return Ok(items);
    }

    /// <summary>Get a specific fuel tank by ID</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FuelTank), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(Guid id)
    {
        var tank = await _context.Tanks.Include(t => t.Alerts).FirstOrDefaultAsync(t => t.Id == id);
        return tank == null ? NotFound() : Ok(tank);
    }

    /// <summary>Create a new fuel tank (Admin only)</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FuelTank), 201)]
    public async Task<IActionResult> Create([FromBody] CreateTankRequest req)
    {
        var tank = new FuelTank
        {
            StationId = req.StationId,
            FuelType = req.FuelType,
            CapacityLitres = req.CapacityLitres,
            CurrentLevelLitres = req.InitialLevelLitres,
            PricePerLitre = req.PricePerLitre
        };
        _context.Tanks.Add(tank);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = tank.Id }, tank);
    }

    /// <summary>Update fuel level in tank (Dealer/Admin)</summary>
    [HttpPut("{id:guid}/level")]
    [Authorize(Roles = "Dealer,Admin")]
    [ProducesResponseType(typeof(FuelTank), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> UpdateLevel(Guid id, [FromBody] UpdateLevelRequest req)
    {
        var tank = await _context.Tanks.Include(t => t.Alerts).FirstOrDefaultAsync(t => t.Id == id);
        if (tank == null) return NotFound();
        if (req.NewLevelLitres < 0 || req.NewLevelLitres > tank.CapacityLitres)
            return BadRequest(new { message = $"Level must be between 0 and {tank.CapacityLitres}" });

        var oldLevel = tank.CurrentLevelLitres;
        tank.CurrentLevelLitres = req.NewLevelLitres;
        tank.LastUpdated = DateTime.UtcNow;

        // Check and trigger alerts
        foreach (var alert in tank.Alerts.Where(a => a.IsActive))
        {
            alert.IsTriggered = req.NewLevelLitres <= alert.Threshold;
        }

        await _context.SaveChangesAsync();

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
        var stockEvt = new StockUpdatedEvent(tank.Id, tank.StationId, tank.FuelType, oldLevel, tank.CurrentLevelLitres, userId, DateTime.UtcNow);
        await _bus.PublishAsync("stock-updated", stockEvt);

        // Invalidate cache
        if (_redis != null) await _redis.KeyDeleteAsync($"tanks:{tank.StationId}:*");

        return Ok(tank);
    }

    /// <summary>Update fuel price for a tank</summary>
    [HttpPut("{id:guid}/price")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(typeof(FuelTank), 200)]
    public async Task<IActionResult> UpdatePrice(Guid id, [FromBody] UpdatePriceRequest req)
    {
        var tank = await _context.Tanks.FindAsync(id);
        if (tank == null) return NotFound();

        var oldPrice = tank.PricePerLitre;
        tank.PricePerLitre = req.PricePerLitre;
        tank.LastUpdated = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
        var priceEvt = new FuelPriceUpdatedEvent(
            tank.Id,
            tank.StationId,
            tank.FuelType,
            oldPrice,
            tank.PricePerLitre,
            userId,
            DateTime.UtcNow);
        await _bus.PublishAsync("fuel-price-updated", priceEvt);

        return Ok(tank);
    }

    /// <summary>Bulk update price for all tanks of a fuel type (Admin only)</summary>
    [HttpPut("prices/bulk")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> BulkUpdatePrice([FromBody] BulkUpdatePriceRequest req)
    {
        var fuelType = (req.FuelType ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(fuelType))
            return BadRequest(new { message = "FuelType is required." });

        var tanks = await _context.Tanks.Where(t => t.FuelType == fuelType).ToListAsync();
        if (tanks.Count == 0)
            return NotFound(new { message = $"No tanks found for fuel type '{fuelType}'." });

        decimal? oldPriceSnapshot = tanks.Select(t => (decimal?)t.PricePerLitre).Max();
        var now = DateTime.UtcNow;

        foreach (var tank in tanks)
        {
            tank.PricePerLitre = req.PricePerLitre;
            tank.LastUpdated = now;
        }

        await _context.SaveChangesAsync();

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
        var priceEvt = new FuelPriceUpdatedEvent(
            TankId: null,
            StationId: null,
            FuelType: fuelType,
            OldPricePerLitre: oldPriceSnapshot,
            NewPricePerLitre: req.PricePerLitre,
            UpdatedBy: userId,
            Timestamp: now);
        await _bus.PublishAsync("fuel-price-updated", priceEvt);

        return Ok(new { updated = tanks.Count, fuelType, pricePerLitre = req.PricePerLitre, updatedAt = now });
    }
}

[ApiController]
[Route("api/alerts")]
[Authorize]
[Produces("application/json")]
public class AlertsController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public AlertsController(InventoryDbContext context) => _context = context;

    /// <summary>Get all active stock alerts</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<StockAlert>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] bool? triggered)
    {
        var query = _context.Alerts.Include(a => a.Tank).AsQueryable();
        if (triggered.HasValue) query = query.Where(a => a.IsTriggered == triggered);
        return Ok(await query.ToListAsync());
    }

    /// <summary>Create a stock alert for a tank</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(typeof(StockAlert), 201)]
    public async Task<IActionResult> Create([FromBody] CreateAlertRequest req)
    {
        var alert = new StockAlert
        {
            TankId = req.TankId,
            AlertType = req.AlertType,
            Threshold = req.Threshold
        };
        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();
        return Created($"/api/alerts/{alert.Id}", alert);
    }

    /// <summary>Deactivate an alert</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var alert = await _context.Alerts.FindAsync(id);
        if (alert == null) return NotFound();
        alert.IsActive = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Alert deactivated." });
    }
}

[ApiController]
[Route("api/replenishment")]
[Authorize]
[Produces("application/json")]
public class ReplenishmentController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly IRabbitMqService _bus;

    public ReplenishmentController(InventoryDbContext context, IRabbitMqService bus = null!)
    {
        _context = context;
        _bus = bus;
    }

    /// <summary>Get all replenishment orders</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ReplenishmentOrder>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = _context.ReplenishmentOrders.Include(r => r.Tank).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(r => r.Status == status);
        return Ok(await query.OrderByDescending(r => r.OrderedAt).ToListAsync());
    }

    /// <summary>Create a new replenishment order</summary>
    [HttpPost]
    [Authorize(Roles = "Dealer,Admin")]
    [ProducesResponseType(typeof(ReplenishmentOrder), 201)]
    public async Task<IActionResult> Create([FromBody] CreateReplenishmentRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
        var order = new ReplenishmentOrder
        {
            TankId = req.TankId,
            QuantityLitres = req.QuantityLitres,
            OrderedBy = userId,
            Notes = req.Notes ?? string.Empty
        };
        _context.ReplenishmentOrders.Add(order);
        await _context.SaveChangesAsync();
        return Created($"/api/replenishment/{order.Id}", order);
    }

    /// <summary>Update replenishment order status (Admin)</summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest req)
    {
        var order = await _context.ReplenishmentOrders.Include(o => o.Tank).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound();

        order.Status = req.Status;
        if (req.Status == "Delivered")
        {
            var oldLevel = order.Tank.CurrentLevelLitres;
            order.DeliveredAt = DateTime.UtcNow;
            order.Tank.CurrentLevelLitres = Math.Min(
                order.Tank.CurrentLevelLitres + order.QuantityLitres,
                order.Tank.CapacityLitres);
            order.Tank.LastUpdated = DateTime.UtcNow;

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
            var stockEvt = new StockUpdatedEvent(order.Tank.Id, order.Tank.StationId, order.Tank.FuelType, oldLevel, order.Tank.CurrentLevelLitres, userId, DateTime.UtcNow);
            
            if (_bus != null)
                await _bus.PublishAsync("stock-updated", stockEvt);
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = $"Order status updated to {req.Status}" });
    }
}

// Request DTOs
public record CreateTankRequest(Guid StationId, string FuelType, double CapacityLitres, double InitialLevelLitres, decimal PricePerLitre);
public record UpdateLevelRequest(double NewLevelLitres, string Reason = "Manual update");
public record UpdatePriceRequest(decimal PricePerLitre);
public record BulkUpdatePriceRequest(string FuelType, decimal PricePerLitre);
public record CreateAlertRequest(Guid TankId, string AlertType, double Threshold);
public record CreateReplenishmentRequest(Guid TankId, double QuantityLitres, string? Notes);
public record UpdateOrderStatusRequest(string Status);
