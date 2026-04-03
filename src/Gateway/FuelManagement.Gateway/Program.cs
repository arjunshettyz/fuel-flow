using System.Net.Http.Json;
using System.Text;
using FuelManagement.Common.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

LoadEnvFile(builder.Environment.ContentRootPath);
builder.Configuration.AddEnvironmentVariables();

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// JWT Auth for gateway-level validation
var jwtSecret = builder.Configuration["JwtSettings:Secret"]!;
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"]!;
var jwtAudience = builder.Configuration["JwtSettings:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer, ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddFuelManagementApiDefaults();
builder.Services.AddAuthorization();

// Swagger for gateway-level docs
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Fuel Management — API Gateway",
        Version = "v1",
        Description = "Ocelot API Gateway routing requests to all 8 microservices of the Indian Fuel Management System. Use /gateway/* prefix to reach each service.",
        Contact = new OpenApiContact { Name = "Fuel Management System", Email = "admin@fuelmanagement.in" }
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
        Description = "Paste your JWT here. Obtain it from POST /gateway/auth/login"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

builder.Services.AddHttpClient();
builder.Services.AddOcelot();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseFuelManagementApiDefaults();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "API Gateway v1");
    c.DocumentTitle = "Fuel Management — API Gateway";
    c.RoutePrefix = "swagger";
});

app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    // These endpoints must run BEFORE Ocelot (Ocelot is terminal middleware)
    endpoints.MapHealthChecks("/healthz");
    endpoints.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
    endpoints.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow, Services = new[] {
        "Identity:5001", "Inventory:5002", "Sales:5003", "Reporting:5004",
        "Notification:5005", "FraudDetection:5006", "Station:5007", "Audit:5008"
    }})).WithName("HealthCheck").WithTags("Health");

    endpoints.MapPost("/gateway/ai/chat", async (
        AiChatRequest request,
        IConfiguration config,
        IHttpClientFactory httpClientFactory) =>
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return Results.BadRequest(new AiChatResponse("Please enter a message."));
        }

        var apiKey = config["AI_ASSISTANT_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return Results.Ok(new AiChatResponse("AI assistant is not configured. Add your API key to enable responses."));
        }

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = "You are FuelFlow AI, a helpful assistant for fuel operations. Keep answers concise, actionable, and aligned to orders, pricing, logistics, and account help.\nUser: " + request.Message }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 300,
            }
        };

        var http = httpClientFactory.CreateClient();
        try
        {
            var response = await http.PostAsJsonAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}",
                payload);

            if (!response.IsSuccessStatusCode)
            {
                return Results.Ok(new AiChatResponse(
                    $"I had trouble reaching the AI service (status {(int)response.StatusCode}). Please try again shortly."));
            }

            var data = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var reply = data?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text
                ?? "I was unable to generate a response.";

            return Results.Ok(new AiChatResponse(reply));
        }
        catch
        {
            return Results.Ok(new AiChatResponse("I had trouble reaching the AI service. Please try again shortly."));
        }
    });
});

await app.UseOcelot();
app.Run();

static void LoadEnvFile(string contentRootPath)
{
    var envPath = Path.GetFullPath(Path.Combine(contentRootPath, "..", "..", "..", ".env"));
    if (!File.Exists(envPath))
    {
        return;
    }

    foreach (var line in File.ReadAllLines(envPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#"))
        {
            continue;
        }

        var separatorIndex = trimmed.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = trimmed[..separatorIndex].Trim();
        var value = trimmed[(separatorIndex + 1)..].Trim();
        if (string.IsNullOrEmpty(key))
        {
            continue;
        }

        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

sealed record AiChatRequest(string Message);
sealed record AiChatResponse(string Reply);
sealed record GeminiResponse(GeminiCandidate[]? Candidates);
sealed record GeminiCandidate(GeminiContent? Content);
sealed record GeminiContent(GeminiPart[]? Parts);
sealed record GeminiPart(string? Text);
