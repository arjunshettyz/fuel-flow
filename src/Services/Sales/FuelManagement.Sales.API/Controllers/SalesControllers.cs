using FuelManagement.Common.Messaging;
using FuelManagement.Contracts.Events;
using System.Text.Json;
using FuelManagement.Sales.API.Data;
using FuelManagement.Sales.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FuelManagement.Sales.API.Controllers;

[ApiController]
[Route("api/transactions")]
[Authorize]
[Produces("application/json")]
public class TransactionsController : ControllerBase
{
    private readonly SalesDbContext _context;
    private readonly IRabbitMqService _bus;
    private readonly IMemoryCache _cache;

    public TransactionsController(SalesDbContext context, IRabbitMqService bus, IMemoryCache cache)
    {
        _context = context;
        _bus = bus;
        _cache = cache;
    }

    /// <summary>Record a new fuel sale transaction</summary>
    [HttpPost]
    [Authorize(Roles = "Dealer,Admin")]
    [ProducesResponseType(typeof(Transaction), 201)]
    public async Task<IActionResult> Create([FromBody] CreateTransactionRequest req)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
        var idempotencyKey = Request.Headers["Idempotency-Key"].FirstOrDefault();
        var requestCacheKey = string.IsNullOrWhiteSpace(idempotencyKey)
            ? null
            : $"transactions:{userId}:{idempotencyKey}";

        if (!string.IsNullOrWhiteSpace(requestCacheKey) && _cache.TryGetValue<Guid>(requestCacheKey, out var existingTransactionId))
        {
            var existing = await _context.Transactions.Include(t => t.Pump).FirstOrDefaultAsync(t => t.Id == existingTransactionId);
            if (existing is not null)
            {
                return Ok(existing);
            }
        }

        var pump = await _context.Pumps.FindAsync(req.PumpId);
        if (pump == null || !pump.IsActive)
            return BadRequest(new { message = "Pump not found or inactive." });

        var receiptNo = $"REC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
        var total = (decimal)req.QuantityLitres * req.UnitPrice;

        var tx = new Transaction
        {
            StationId = req.StationId,
            PumpId = req.PumpId,
            FuelType = req.FuelType,
            QuantityLitres = req.QuantityLitres,
            UnitPrice = req.UnitPrice,
            TotalAmount = total,
            PaymentMethod = req.PaymentMethod,
            CustomerId = req.CustomerId,
            CustomerPhone = req.CustomerPhone ?? string.Empty,
            RecordedBy = userId,
            ReceiptNumber = receiptNo
        };
        _context.Transactions.Add(tx);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(requestCacheKey))
        {
            _cache.Set(requestCacheKey, tx.Id, TimeSpan.FromMinutes(10));
        }

        // Publish Events
        var saleEvent = new SaleRecordedEvent(tx.Id, tx.StationId, tx.PumpId, tx.FuelType, tx.QuantityLitres, tx.TotalAmount, tx.PaymentMethod, tx.CustomerId, tx.CreatedAt);
        await _bus.PublishAsync("sale-recorded", saleEvent);

        var auditEvent = new AuditEvent("CREATE", "Transaction", tx.Id.ToString(), tx.RecordedBy, null, JsonSerializer.Serialize(tx), "SalesService", DateTime.UtcNow);
        await _bus.PublishAsync("audit-log", auditEvent);

        return Created($"/api/transactions/{tx.Id}", tx);
    }

    /// <summary>Get all transactions with filtering</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Transaction>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? stationId, [FromQuery] string? fuelType,
        [FromQuery] string? paymentMethod, [FromQuery] DateTime? from,
        [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.Transactions.Include(t => t.Pump).AsQueryable();
        if (stationId.HasValue) query = query.Where(t => t.StationId == stationId);
        if (!string.IsNullOrEmpty(fuelType)) query = query.Where(t => t.FuelType == fuelType);
        if (!string.IsNullOrEmpty(paymentMethod)) query = query.Where(t => t.PaymentMethod == paymentMethod);
        if (from.HasValue) query = query.Where(t => t.CreatedAt >= from);
        if (to.HasValue) query = query.Where(t => t.CreatedAt <= to);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>Compatibility alias for list-style clients.</summary>
    [HttpGet("list")]
    [ProducesResponseType(typeof(List<Transaction>), 200)]
    public Task<IActionResult> List(
        [FromQuery] Guid? stationId, [FromQuery] string? fuelType,
        [FromQuery] string? paymentMethod, [FromQuery] DateTime? from,
        [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => GetAll(stationId, fuelType, paymentMethod, from, to, page, pageSize);

    /// <summary>Get transaction by ID</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(Transaction), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(Guid id)
    {
        var tx = await _context.Transactions.Include(t => t.Pump).FirstOrDefaultAsync(t => t.Id == id);
        return tx == null ? NotFound() : Ok(tx);
    }

    /// <summary>Get transactions for a specific station</summary>
    [HttpGet("station/{stationId:guid}")]
    [ProducesResponseType(typeof(List<Transaction>), 200)]
    public async Task<IActionResult> ByStation(Guid stationId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _context.Transactions.Where(t => t.StationId == stationId);
        if (from.HasValue) query = query.Where(t => t.CreatedAt >= from);
        if (to.HasValue) query = query.Where(t => t.CreatedAt <= to);
        return Ok(await query.OrderByDescending(t => t.CreatedAt).ToListAsync());
    }

    /// <summary>Get sales summary (total amount, litres) for a station/date range</summary>
    [HttpGet("summary")]
    [Authorize(Roles = "Dealer,Admin")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Summary([FromQuery] Guid? stationId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _context.Transactions.AsQueryable();
        if (stationId.HasValue) query = query.Where(t => t.StationId == stationId);
        if (from.HasValue) query = query.Where(t => t.CreatedAt >= from);
        if (to.HasValue) query = query.Where(t => t.CreatedAt <= to);

        var result = await query.GroupBy(t => t.FuelType).Select(g => new
        {
            FuelType = g.Key,
            TotalTransactions = g.Count(),
            TotalLitres = g.Sum(t => t.QuantityLitres),
            TotalRevenue = g.Sum(t => t.TotalAmount)
        }).ToListAsync();

        return Ok(result);
    }
}

[ApiController]
[Route("api/pumps")]
[Authorize]
[Produces("application/json")]
public class PumpsController : ControllerBase
{
    private readonly SalesDbContext _context;
    public PumpsController(SalesDbContext context) => _context = context;

    /// <summary>Get all pumps with optional station filter</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Pump>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? stationId)
    {
        var query = _context.Pumps.AsQueryable();
        if (stationId.HasValue) query = query.Where(p => p.StationId == stationId);
        return Ok(await query.ToListAsync());
    }

    /// <summary>Add a new pump (Admin only)</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(Pump), 201)]
    public async Task<IActionResult> Create([FromBody] CreatePumpRequest req)
    {
        var pump = new Pump { StationId = req.StationId, Name = req.Name, FuelType = req.FuelType };
        _context.Pumps.Add(pump);
        await _context.SaveChangesAsync();
        return Created($"/api/pumps/{pump.Id}", pump);
    }

    /// <summary>Update pump status (Admin/Dealer)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(typeof(Pump), 200)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePumpRequest req)
    {
        var pump = await _context.Pumps.FindAsync(id);
        if (pump == null) return NotFound();
        pump.IsActive = req.IsActive;
        pump.IsUnderMaintenance = req.IsUnderMaintenance;
        if (req.IsUnderMaintenance) pump.LastMaintenance = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(pump);
    }
}

public record CreateTransactionRequest(
    Guid StationId, Guid PumpId, string FuelType,
    double QuantityLitres, decimal UnitPrice, string PaymentMethod,
    Guid? CustomerId, string? CustomerPhone);

public record CreatePumpRequest(Guid StationId, string Name, string FuelType);
public record UpdatePumpRequest(bool IsActive, bool IsUnderMaintenance);
