using System.Text;
using FuelManagement.Common.Extensions;
using FuelManagement.Identity.API.Data;
using FuelManagement.Identity.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Configuration
var jwtSection = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSection);
var jwtSettings = jwtSection.Get<JwtSettings>()!;
builder.Services.Configure<OtpSettings>(builder.Configuration.GetSection("OtpSettings"));
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("MailSettings"));

// Database
builder.Services.AddDbContext<IdentityDbContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("IdentityDb"));
    opts.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// Services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailOtpService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings.Secret))
        };
    });

builder.Services.AddFuelManagementApiDefaults();
builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Identity Service API",
        Version = "v1",
        Description = "JWT authentication, user management, and role-based access control for the Indian Fuel Management System."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token (without 'Bearer ' prefix)."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

var app = builder.Build();

app.UseFuelManagementApiDefaults();

// Auto-migrate & Seed Data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'[EmailOtpTokens]', N'U') IS NULL
BEGIN
    CREATE TABLE [EmailOtpTokens] (
        [Id] UNIQUEIDENTIFIER NOT NULL,
        [Email] NVARCHAR(256) NOT NULL,
        [Purpose] NVARCHAR(64) NOT NULL,
        [CodeHash] NVARCHAR(200) NOT NULL,
        [ExpiresAt] DATETIME2 NOT NULL,
        [IsVerified] BIT NOT NULL CONSTRAINT [DF_EmailOtpTokens_IsVerified] DEFAULT(0),
        [IsConsumed] BIT NOT NULL CONSTRAINT [DF_EmailOtpTokens_IsConsumed] DEFAULT(0),
        [VerifiedAt] DATETIME2 NULL,
        [FailedAttempts] INT NOT NULL CONSTRAINT [DF_EmailOtpTokens_FailedAttempts] DEFAULT(0),
        [CreatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_EmailOtpTokens] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_EmailOtpTokens_Email_Purpose_CreatedAt'
      AND object_id = OBJECT_ID(N'[EmailOtpTokens]'))
BEGIN
    CREATE INDEX [IX_EmailOtpTokens_Email_Purpose_CreatedAt]
        ON [EmailOtpTokens] ([Email], [Purpose], [CreatedAt]);
END;
");

    // Seed sample users
    if (!db.Users.Any(u => u.Email == "admin@fuel.local"))
    {
        db.Users.Add(
            new FuelManagement.Identity.API.Models.ApplicationUser
            {
                FullName = "System Admin",
                Email = "admin@fuel.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = "Admin",
                Phone = "9876543210",
                IsActive = true
            }
        );
        db.SaveChanges();
    }

    if (!db.Users.Any(u => u.Email == "customer@fuel.local"))
    {
        db.Users.Add(
            new FuelManagement.Identity.API.Models.ApplicationUser
            {
                FullName = "Sample Customer",
                Email = "customer@fuel.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Customer@123"),
                Role = "Customer",
                Phone = "9876543211",
                IsActive = true
            }
        );
        db.SaveChanges();
    }

    if (!db.Users.Any(u => u.Email == "dealer@fuel.local"))
    {
        db.Users.Add(
            new FuelManagement.Identity.API.Models.ApplicationUser
            {
                FullName = "Sample Dealer",
                Email = "dealer@fuel.local",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dealer@123"),
                Role = "Dealer",
                Phone = "9876543212",
                IsActive = true
            }
        );
        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Identity Service v1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "Identity Service — Fuel Management";
});

app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/healthz");
app.MapControllers();

app.Run();
