using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FuelManagement.Identity.API.Data;
using FuelManagement.Identity.API.DTOs;
using FuelManagement.Identity.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FuelManagement.Identity.API.Services;

public class TokenService
{
    private readonly JwtSettings _jwt;
    private readonly IdentityDbContext _context;

    public TokenService(IOptions<JwtSettings> jwt, IdentityDbContext context)
    {
        _jwt = jwt.Value;
        _context = context;
    }

    public string GenerateAccessToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role),
            new("stationId", user.StationId?.ToString() ?? ""),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.AccessTokenExpiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<RefreshToken> GenerateRefreshTokenAsync(Guid userId)
    {
        var token = new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
        };
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();
        return token;
    }

    public async Task<RefreshToken?> GetValidRefreshTokenAsync(string token)
    {
        return await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r =>
                r.Token == token &&
                !r.IsRevoked &&
                r.ExpiresAt > DateTime.UtcNow &&
                r.User.IsActive);
    }

    public async Task RevokeRefreshTokenAsync(string token)
    {
        var rt = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token);
        if (rt != null)
        {
            rt.IsRevoked = true;
            await _context.SaveChangesAsync();
        }
    }
}

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 15;
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
