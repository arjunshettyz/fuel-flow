using System.Text;
using FuelManagement.Common.Extensions;
using FuelManagement.Common.Messaging;
using FuelManagement.FraudDetection.API;
using FuelManagement.FraudDetection.API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddHostedService<FraudDetectionBackgroundService>();
builder.Services.AddDbContext<FraudDbContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("FraudDb"));
    opts.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});
var jwtSecret = builder.Configuration["JwtSettings:Secret"]!;
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"]!;
var jwtAudience = builder.Configuration["JwtSettings:Audience"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer, ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});
builder.Services.AddFuelManagementApiDefaults();
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Fraud Detection Service API", Version = "v1", Description = "Rule-based anomaly detection, pattern analysis, and fraud alert management." });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});
var app = builder.Build();
app.UseFuelManagementApiDefaults();
using (var scope = app.Services.CreateScope()) { scope.ServiceProvider.GetRequiredService<FraudDbContext>().Database.Migrate(); }
app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fraud Detection Service v1"); c.DocumentTitle = "Fraud Detection — Fuel Management"; });
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/healthz");
app.MapControllers();
app.Run();
