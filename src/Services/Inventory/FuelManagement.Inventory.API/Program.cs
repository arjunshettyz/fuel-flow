using System.Text;
using FuelManagement.Common.Extensions;
using FuelManagement.Common.Messaging;
using FuelManagement.Inventory.API.Data;
using FuelManagement.Inventory.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddDbContext<InventoryDbContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("InventoryDb"));
    opts.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// Redis (optional, graceful degradation)
try
{
    var redisConn = builder.Configuration.GetConnectionString("Redis")!;
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
}
catch { /* Redis unavailable - cache disabled */ }

// JWT Auth (shared settings)
var jwtSecret = builder.Configuration["JwtSettings:Secret"]!;
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"]!;
var jwtAudience = builder.Configuration["JwtSettings:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddFuelManagementApiDefaults();
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Inventory Service API",
        Version = "v1",
        Description = "Fuel tank management, stock tracking, alerts, and replenishment orders."
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
        Description = "Enter your JWT token."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

var app = builder.Build();

app.UseFuelManagementApiDefaults();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
    db.Database.Migrate();

    // Seed sample tanks for demo-friendly pricing flows
    if (!db.Tanks.Any())
    {
        var now = DateTime.UtcNow;

        // Station IDs are opaque GUIDs here (no FK), so we can seed safely.
        var mgRoad = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var hsr = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var indiranagar = Guid.Parse("33333333-3333-3333-3333-333333333333");

        db.Tanks.AddRange(
            new FuelTank { StationId = mgRoad, FuelType = "Petrol", CapacityLitres = 20000, CurrentLevelLitres = 14500, PricePerLitre = 97.45m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = mgRoad, FuelType = "Diesel", CapacityLitres = 25000, CurrentLevelLitres = 16200, PricePerLitre = 89.10m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = mgRoad, FuelType = "CNG", CapacityLitres = 12000, CurrentLevelLitres = 8200, PricePerLitre = 78.25m, LastUpdated = now, CreatedAt = now },

            new FuelTank { StationId = hsr, FuelType = "Petrol", CapacityLitres = 18000, CurrentLevelLitres = 12100, PricePerLitre = 97.60m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = hsr, FuelType = "Diesel", CapacityLitres = 24000, CurrentLevelLitres = 14350, PricePerLitre = 89.35m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = hsr, FuelType = "CNG", CapacityLitres = 12000, CurrentLevelLitres = 7600, PricePerLitre = 78.25m, LastUpdated = now, CreatedAt = now },

            new FuelTank { StationId = indiranagar, FuelType = "Petrol", CapacityLitres = 19000, CurrentLevelLitres = 13020, PricePerLitre = 97.55m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = indiranagar, FuelType = "Diesel", CapacityLitres = 23000, CurrentLevelLitres = 15010, PricePerLitre = 89.20m, LastUpdated = now, CreatedAt = now },
            new FuelTank { StationId = indiranagar, FuelType = "CNG", CapacityLitres = 12000, CurrentLevelLitres = 7900, PricePerLitre = 78.40m, LastUpdated = now, CreatedAt = now }
        );

        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventory Service v1");
    c.DocumentTitle = "Inventory Service — Fuel Management";
});

app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/healthz");
app.MapControllers();
app.Run();
