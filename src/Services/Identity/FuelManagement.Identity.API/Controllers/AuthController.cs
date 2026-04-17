using FuelManagement.Identity.API.Data;
using FuelManagement.Identity.API.DTOs;
using FuelManagement.Identity.API.Models;
using FuelManagement.Identity.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;

namespace FuelManagement.Identity.API.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IdentityDbContext _context;
    private readonly TokenService _tokenService;
    private readonly EmailOtpService _emailOtpService;

    public AuthController(IdentityDbContext context, TokenService tokenService, EmailOtpService emailOtpService)
    {
        _context = context;
        _tokenService = tokenService;
        _emailOtpService = emailOtpService;
    }

    /// <summary>Send OTP to email for Register/Login flows</summary>
    [HttpPost("email-otp/send")]
    [ProducesResponseType(typeof(SendEmailOtpResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SendEmailOtp([FromBody] SendEmailOtpRequest req, CancellationToken cancellationToken)
    {
        var identifier = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var purpose = MailOtpPurposes.Normalize(req.Purpose);
        
        string targetEmail = identifier;

        if (purpose == MailOtpPurposes.Login || purpose == MailOtpPurposes.ForgotPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => 
                (u.Email == identifier || u.Phone == identifier) && u.IsActive, cancellationToken);
                
            if (user == null)
                return BadRequest(new { message = "Account not found." });
                
            targetEmail = user.Email; // Swap phone for their actual email
        }
        else
        {
            if (!IsValidEmail(targetEmail))
                return BadRequest(new { message = "Invalid email address." });

            if (await _context.Users.AnyAsync(u => u.Email == targetEmail, cancellationToken))
                return BadRequest(new { message = "Email already registered." });
        }

        var result = await _emailOtpService.SendOtpAsync(targetEmail, purpose, cancellationToken);
        return Ok(new SendEmailOtpResponse(result.Message, result.ExpiresInSeconds, result.DevOtpCode));
    }

    /// <summary>Verify OTP sent to email</summary>
    [HttpPost("email-otp/verify")]
    [ProducesResponseType(typeof(VerifyEmailOtpResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> VerifyEmailOtp([FromBody] VerifyEmailOtpRequest req, CancellationToken cancellationToken)
    {
        var identifier = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var purpose = MailOtpPurposes.Normalize(req.Purpose);
        string targetEmail = identifier;

        if (purpose == MailOtpPurposes.Login || purpose == MailOtpPurposes.ForgotPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => 
                (u.Email == identifier || u.Phone == identifier), cancellationToken);
            if (user != null) targetEmail = user.Email;
        }
        else if (!IsValidEmail(targetEmail))
        {
            return BadRequest(new { message = "Invalid email address." });
        }

        var result = await _emailOtpService.VerifyOtpAsync(targetEmail, req.Otp, purpose, consumeOnSuccess: false, cancellationToken);
        if (!result.Verified)
            return BadRequest(new VerifyEmailOtpResponse(false, result.Message));

        return Ok(new VerifyEmailOtpResponse(true, result.Message));
    }

    /// <summary>Reset password using verified email OTP</summary>
    [HttpPost("forgot-password/reset")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ResetForgotPassword([FromBody] ForgotPasswordResetRequest req, CancellationToken cancellationToken)
    {
        var identifier = (req.Identifier ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(identifier))
            return BadRequest(new { message = "Email or phone is required." });

        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
            return BadRequest(new { message = "New password must be at least 8 characters." });

        var user = await _context.Users.FirstOrDefaultAsync(
            u => (u.Email == identifier || u.Phone == identifier) && u.IsActive,
            cancellationToken);

        if (user == null)
            return BadRequest(new { message = "Account not found." });

        var verify = await _emailOtpService.VerifyOtpAsync(
            user.Email,
            req.Otp,
            MailOtpPurposes.ForgotPassword,
            consumeOnSuccess: true,
            cancellationToken);

        if (!verify.Verified)
            return BadRequest(new { message = verify.Message });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Password reset successful." });
    }

    /// <summary>Register a new user</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var normalizedEmail = (req.Email ?? string.Empty).Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
            return BadRequest(new { message = "Email already registered." });

        var otpConsumed = await _emailOtpService.ConsumeVerifiedOtpAsync(normalizedEmail, MailOtpPurposes.Register);
        if (!otpConsumed)
            return BadRequest(new { message = "Email OTP verification is required before registration." });

        var user = new ApplicationUser
        {
            FullName = req.FullName,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = req.Role,
            Phone = req.Phone,
            StationId = req.StationId
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

        Response.Cookies.Append("refreshToken", refreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = refreshToken.ExpiresAt
        });

        return Ok(new AuthResponse(accessToken, "Bearer",
            15 * 60, MapUser(user)));
    }

    /// <summary>Login and obtain JWT tokens</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var identifier = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        
        var user = await _context.Users.FirstOrDefaultAsync(u => 
            (u.Email == identifier || u.Phone == identifier) && u.IsActive);
            
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

        Response.Cookies.Append("refreshToken", refreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = refreshToken.ExpiresAt
        });

        return Ok(new AuthResponse(accessToken, "Bearer", 15 * 60, MapUser(user)));
    }

    /// <summary>Login using email OTP</summary>
    [HttpPost("login-with-otp")]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> LoginWithOtp([FromBody] LoginWithOtpRequest req, CancellationToken cancellationToken)
    {
        var identifier = (req.Email ?? string.Empty).Trim().ToLowerInvariant();

        var user = await _context.Users.FirstOrDefaultAsync(u => 
            (u.Email == identifier || u.Phone == identifier) && u.IsActive, cancellationToken);
            
        if (user == null)
            return Unauthorized(new { message = "Invalid OTP login request." });

        var verify = await _emailOtpService.VerifyOtpAsync(
            user.Email, // Ensure we check OTP against their registered email!
            req.Otp,
            MailOtpPurposes.Login,
            consumeOnSuccess: true,
            cancellationToken);

        if (!verify.Verified)
            return Unauthorized(new { message = verify.Message });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

        Response.Cookies.Append("refreshToken", refreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = refreshToken.ExpiresAt
        });

        return Ok(new AuthResponse(accessToken, "Bearer", 15 * 60, MapUser(user)));
    }

    /// <summary>Refresh the access token using the refresh token cookie</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh()
    {
        var cookieToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(cookieToken))
            return Unauthorized(new { message = "Refresh token not found." });

        var rt = await _tokenService.GetValidRefreshTokenAsync(cookieToken);
        if (rt == null)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        await _tokenService.RevokeRefreshTokenAsync(cookieToken);
        var newAccessToken = _tokenService.GenerateAccessToken(rt.User);
        var newRefreshToken = await _tokenService.GenerateRefreshTokenAsync(rt.UserId);

        Response.Cookies.Append("refreshToken", newRefreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = newRefreshToken.ExpiresAt
        });

        return Ok(new AuthResponse(newAccessToken, "Bearer", 15 * 60, MapUser(rt.User)));
    }

    /// <summary>Logout and revoke the refresh token</summary>
    [HttpPost("logout")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Logout()
    {
        var cookieToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(cookieToken))
            await _tokenService.RevokeRefreshTokenAsync(cookieToken);

        Response.Cookies.Delete("refreshToken");
        return Ok(new { message = "Logged out successfully." });
    }

    private static UserDto MapUser(ApplicationUser u) =>
        new(u.Id, u.FullName, u.Email, u.Role, u.Phone, u.StationId, u.IsActive, u.CreatedAt);

    private static bool IsValidEmail(string email)
    {
        try
        {
            var parsed = new MailAddress(email);
            return parsed.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }
}
