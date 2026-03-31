using System.Text;
using FuelManagement.Common.Extensions;
using FuelManagement.Common.Messaging;
using FuelManagement.Audit.API;
using FuelManagement.Audit.API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddHostedService<AuditBackgroundService>();
builder.Services.AddDbContext<AuditDbContext>(opts =>
{
    opts.UseSqlServer(builder.Configuration.GetConnectionString("AuditDb"));
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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Audit Service API", Version = "v1", Description = "Immutable audit trail for all system events across the Fuel Management System." });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});
var app = builder.Build();
app.UseFuelManagementApiDefaults();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'[dbo].[AuditLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [EventType] nvarchar(50) NOT NULL,
        [EntityType] nvarchar(100) NOT NULL,
        [EntityId] nvarchar(450) NOT NULL,
        [UserId] nvarchar(450) NULL,
        [OldValues] nvarchar(max) NULL,
        [NewValues] nvarchar(max) NULL,
        [ServiceName] nvarchar(100) NOT NULL,
        [IpAddress] nvarchar(max) NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
    );

    CREATE INDEX [IX_AuditLogs_EntityType_EntityId] ON [dbo].[AuditLogs]([EntityType], [EntityId]);
    CREATE INDEX [IX_AuditLogs_UserId] ON [dbo].[AuditLogs]([UserId]);
    CREATE INDEX [IX_AuditLogs_Timestamp] ON [dbo].[AuditLogs]([Timestamp]);
END");
}
app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "Audit Service v1"); c.DocumentTitle = "Audit Service — Fuel Management"; });
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/healthz");
app.MapControllers();
app.Run();
