using System.Security.Claims;
using FuelManagement.Identity.API.Data;
using FuelManagement.Identity.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Identity.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    private readonly IdentityDbContext _context;

    public UsersController(IdentityDbContext context) => _context = context;

    /// <summary>Get all users (Admin only)</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(List<UserDto>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? role, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.Users.AsQueryable();
        if (!string.IsNullOrEmpty(role)) query = query.Where(u => u.Role == role);

        var total = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role, u.Phone, u.StationId, u.IsActive, u.CreatedAt))
            .ToListAsync();

        return Ok(new { total, page, pageSize, users });
    }

    /// <summary>Get user by ID</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(Guid id)
    {
        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (callerRole != "Admin" && callerId != id.ToString())
            return Forbid();

        var u = await _context.Users.FindAsync(id);
        if (u == null) return NotFound();
        return Ok(new UserDto(u.Id, u.FullName, u.Email, u.Role, u.Phone, u.StationId, u.IsActive, u.CreatedAt));
    }

    /// <summary>Update user profile</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UserDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req)
    {
        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;
        if (callerRole != "Admin" && callerId != id.ToString()) return Forbid();

        var u = await _context.Users.FindAsync(id);
        if (u == null) return NotFound();

        u.FullName = req.FullName;
        u.Phone = req.Phone;
        u.StationId = req.StationId;
        u.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new UserDto(u.Id, u.FullName, u.Email, u.Role, u.Phone, u.StationId, u.IsActive, u.CreatedAt));
    }

    /// <summary>Deactivate a user (Admin only)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var u = await _context.Users.FindAsync(id);
        if (u == null) return NotFound();
        u.IsActive = false;
        u.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "User deactivated." });
    }

    /// <summary>Change user role (Admin only)</summary>
    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ChangeRole(Guid id, [FromBody] ChangeRoleRequest req)
    {
        var validRoles = new[] { "Customer", "Dealer", "Admin" };
        if (!validRoles.Contains(req.Role))
            return BadRequest(new { message = "Invalid role. Valid roles: Customer, Dealer, Admin" });

        var u = await _context.Users.FindAsync(id);
        if (u == null) return NotFound();

        u.Role = req.Role;
        u.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = $"Role updated to {req.Role}" });
    }
}
