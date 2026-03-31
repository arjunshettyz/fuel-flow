using FuelManagement.Station.API.Data;
using FuelManagement.Station.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Station.API.Controllers;

[ApiController]
[Route("api/stations")]
[Authorize]
[Produces("application/json")]
public class StationsController : ControllerBase
{
    private readonly StationDbContext _context;
    public StationsController(StationDbContext context) => _context = context;

    /// <summary>Get all fuel stations with optional city/state filter</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<FuelStation>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? city, [FromQuery] string? state, [FromQuery] bool? active)
    {
        var query = _context.Stations.Include(s => s.OperatingHours).AsQueryable();
        if (!string.IsNullOrEmpty(city)) query = query.Where(s => s.City == city);
        if (!string.IsNullOrEmpty(state)) query = query.Where(s => s.State == state);
        if (active.HasValue) query = query.Where(s => s.IsActive == active);
        return Ok(await query.ToListAsync());
    }

    /// <summary>Get station by ID</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FuelStation), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(Guid id)
    {
        var station = await _context.Stations.Include(s => s.OperatingHours).FirstOrDefaultAsync(s => s.Id == id);
        return station == null ? NotFound() : Ok(station);
    }

    /// <summary>Find nearby stations within a radius (km) using Haversine formula</summary>
    [HttpGet("nearby")]
    [AllowAnonymous]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Nearby([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusKm = 10)
    {
        var stations = await _context.Stations.Where(s => s.IsActive).ToListAsync();
        var nearby = stations
            .Select(s => new { Station = s, DistanceKm = CalculateDistance(lat, lng, s.Latitude, s.Longitude) })
            .Where(x => x.DistanceKm <= radiusKm)
            .OrderBy(x => x.DistanceKm)
            .Select(x => new { x.Station.Id, x.Station.Name, x.Station.Address, x.Station.City, x.Station.Phone, x.DistanceKm })
            .ToList();
        return Ok(nearby);
    }

    /// <summary>Create a new station (Admin only)</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FuelStation), 201)]
    public async Task<IActionResult> Create([FromBody] CreateStationRequest req)
    {
        var station = new FuelStation
        {
            Name = req.Name, DealerId = req.DealerId, Address = req.Address,
            City = req.City, State = req.State, PinCode = req.PinCode,
            Latitude = req.Latitude, Longitude = req.Longitude,
            Phone = req.Phone, LicenseNumber = req.LicenseNumber
        };
        _context.Stations.Add(station);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = station.Id }, station);
    }

    /// <summary>Update station details (Admin)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FuelStation), 200)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateStationRequest req)
    {
        var station = await _context.Stations.FindAsync(id);
        if (station == null) return NotFound();
        station.Name = req.Name; station.Address = req.Address;
        station.City = req.City; station.State = req.State;
        station.Phone = req.Phone; station.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(station);
    }

    /// <summary>Deactivate a station (Admin)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var station = await _context.Stations.FindAsync(id);
        if (station == null) return NotFound();
        station.IsActive = false; station.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Station deactivated." });
    }

    /// <summary>Set operating hours for a station</summary>
    [HttpPut("{id:guid}/hours")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> SetHours(Guid id, [FromBody] List<SetHoursRequest> hours)
    {
        var station = await _context.Stations.FindAsync(id);
        if (station == null) return NotFound();

        var existing = _context.OperatingHours.Where(h => h.StationId == id);
        _context.OperatingHours.RemoveRange(existing);

        foreach (var h in hours)
        {
            _context.OperatingHours.Add(new OperatingHours
            {
                StationId = id, DayOfWeek = h.DayOfWeek,
                OpenTime = TimeOnly.Parse(h.OpenTime),
                CloseTime = TimeOnly.Parse(h.CloseTime),
                Is24Hours = h.Is24Hours, IsClosed = h.IsClosed
            });
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Operating hours updated." });
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}

public record CreateStationRequest(string Name, Guid DealerId, string Address, string City, string State,
    string PinCode, double Latitude, double Longitude, string Phone, string LicenseNumber);
public record SetHoursRequest(DayOfWeek DayOfWeek, string OpenTime, string CloseTime, bool Is24Hours, bool IsClosed);
