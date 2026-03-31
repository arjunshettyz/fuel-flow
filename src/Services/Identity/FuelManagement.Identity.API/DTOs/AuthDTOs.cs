namespace FuelManagement.Identity.API.DTOs;

public record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string Phone,
    string Role = "Customer",
    Guid? StationId = null);

public record LoginRequest(string Email, string Password);

public record LoginWithOtpRequest(string Email, string Otp);

public record SendEmailOtpRequest(string Email, string Purpose = "Register");

public record VerifyEmailOtpRequest(string Email, string Otp, string Purpose = "Register");

public record SendEmailOtpResponse(string Message, int ExpiresInSeconds, string? DevOtpCode = null);

public record VerifyEmailOtpResponse(bool Verified, string Message);

public record RefreshTokenRequest(string RefreshToken);

public record ChangeRoleRequest(string Role);

public record UpdateUserRequest(
    string FullName,
    string Phone,
    Guid? StationId);

public record AuthResponse(
    string AccessToken,
    string TokenType,
    int ExpiresIn,
    UserDto User);

public record UserDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    string Phone,
    Guid? StationId,
    bool IsActive,
    DateTime CreatedAt);
