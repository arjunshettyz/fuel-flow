using System.Net.Http.Json;
using System.Security.Cryptography;
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

var ocelotFile =
    builder.Configuration["Ocelot:File"]
    ?? builder.Configuration["OCELOT_FILE"]
    ?? "ocelot.json";

builder.Configuration.AddJsonFile(ocelotFile, optional: false, reloadOnChange: true);

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
    // NOTE: Don't add a catch-all endpoint like /gateway/{**catchAll} (even for OPTIONS only).
    // Endpoint routing would match the path and return 405 for other verbs before Ocelot runs.
    // CORS preflight for /gateway/* is handled by app.UseCors() above.
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

        var model = config["AI_ASSISTANT_MODEL"]
            ?? config["AiAssistant:Model"]
            ?? "gemini-2.0-flash";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = "You are FuelFlow AI assistant for the Fuel Management website. Help users understand and use product features step-by-step. Explain navigation paths and workflows in simple language. Cover modules: FuelEvent (RFP/procurement), FuelControl (operations), FuelIQ (analytics/fraud insights), FuelRescue (emergency fueling), FuelIntel (reports/compliance), FuelConnect (vendor network). Also help with account login, OTP, customer receipts/PDF download, dealer pump and sales forms, inventory updates, and admin actions. Keep answers concise, practical, and UI-oriented with exact menu/page guidance. If feature data is unavailable, provide safe temporary guidance and ask user to retry.\nUser: " + request.Message }
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
                $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}",
                payload);

            if (!response.IsSuccessStatusCode)
            {
                if ((int)response.StatusCode == 429)
                {
                    return Results.Ok(new AiChatResponse(
                        $"I had trouble reaching the AI service (status 429). {GetFallbackAiReply(request.Message)}"));
                }

                return Results.Ok(new AiChatResponse(
                    $"I had trouble reaching the AI service (status {(int)response.StatusCode}). {GetFallbackAiReply(request.Message)}"));
            }

            var data = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var reply = data?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text
                ?? "I was unable to generate a response.";

            return Results.Ok(new AiChatResponse(reply));
        }
        catch
        {
            return Results.Ok(new AiChatResponse(
                $"I had trouble reaching the AI service. {GetFallbackAiReply(request.Message)}"));
        }
    });

    endpoints.MapPost("/gateway/payments/create-order", async (
        RazorpayCreateOrderRequest request,
        IConfiguration config,
        IHttpClientFactory httpClientFactory) =>
    {
        if (request.Amount <= 0)
        {
            return Results.BadRequest(new { message = "Amount must be greater than zero." });
        }

        var keyId = config["RAZORPAY_KEY_ID"];
        var keySecret = config["RAZORPAY_KEY_SECRET"];
        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
        {
            return Results.BadRequest(new { message = "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
        }

        var amountInPaise = (int)Math.Round(request.Amount * 100m, MidpointRounding.AwayFromZero);
        var razorpayRequest = new
        {
            amount = amountInPaise,
            currency = string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency,
            receipt = string.IsNullOrWhiteSpace(request.Receipt) ? $"rcpt_{Guid.NewGuid():N}" : request.Receipt,
            notes = request.Notes,
            payment_capture = 1,
        };

        var authToken = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
        var http = httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authToken);

        var response = await http.PostAsJsonAsync("https://api.razorpay.com/v1/orders", razorpayRequest);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            return Results.BadRequest(new { message = "Unable to create Razorpay order.", status = (int)response.StatusCode, body });
        }

        var order = await response.Content.ReadFromJsonAsync<RazorpayOrderResponse>();
        if (order == null || string.IsNullOrWhiteSpace(order.id))
        {
            return Results.BadRequest(new { message = "Invalid order response from Razorpay." });
        }

        return Results.Ok(new
        {
            keyId,
            orderId = order.id,
            amount = order.amount,
            currency = order.currency,
            receipt = order.receipt,
        });
    });

    endpoints.MapPost("/gateway/payments/verify", (
        RazorpayVerifyPaymentRequest request,
        IConfiguration config) =>
    {
        var keySecret = config["RAZORPAY_KEY_SECRET"];
        if (string.IsNullOrWhiteSpace(keySecret))
        {
            return Results.BadRequest(new { verified = false, message = "Razorpay secret is not configured." });
        }

        if (string.IsNullOrWhiteSpace(request.razorpay_order_id) ||
            string.IsNullOrWhiteSpace(request.razorpay_payment_id) ||
            string.IsNullOrWhiteSpace(request.razorpay_signature))
        {
            return Results.BadRequest(new { verified = false, message = "Missing payment verification fields." });
        }

        var payload = $"{request.razorpay_order_id}|{request.razorpay_payment_id}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

        var verified = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedSignature),
            Encoding.UTF8.GetBytes(request.razorpay_signature.ToLowerInvariant()));

        if (!verified)
        {
            return Results.BadRequest(new { verified = false, message = "Invalid Razorpay signature." });
        }

        return Results.Ok(new { verified = true, message = "Payment verified successfully." });
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

static string GetFallbackAiReply(string message)
{
    var q = message.ToLowerInvariant();

    if (q.Contains("price") || q.Contains("tier") || q.Contains("plan"))
    {
        return "Pricing tiers: Essential (basic dashboards), Growth (AI workflows + automation), and Enterprise (custom integrations + compliance). Open Landing > Pricing for the latest numbers.";
    }

    if (q.Contains("track") || q.Contains("order") || q.Contains("delivery"))
    {
        return "To track order status, open Customer > Orders, search by order ID, then filter by In Transit or Delivered.";
    }

    if (q.Contains("pump") || q.Contains("inventory") || q.Contains("replenishment"))
    {
        return "For dealer operations: use Dealer > Pumps for status, Dealer > Inventory for dip and delivery updates, and Dealer > Replenishment Request for stock refill.";
    }

    if (q.Contains("receipt") || q.Contains("pdf"))
    {
        return "For receipt PDFs, go to Customer > Receipts or Customer > Transactions and click the PDF action for the record.";
    }

    return "I am Atlas, your FuelFlow assistant. Ask about orders, pricing, inventory, receipts, or account support and I will guide you step-by-step.";
}

sealed record AiChatRequest(string Message);
sealed record AiChatResponse(string Reply);
sealed record GeminiResponse(GeminiCandidate[]? Candidates);
sealed record GeminiCandidate(GeminiContent? Content);
sealed record GeminiContent(GeminiPart[]? Parts);
sealed record GeminiPart(string? Text);
sealed record RazorpayCreateOrderRequest(decimal Amount, string? Currency, string? Receipt, Dictionary<string, string>? Notes);
sealed record RazorpayOrderResponse(string id, int amount, string currency, string receipt);
sealed record RazorpayVerifyPaymentRequest(string razorpay_order_id, string razorpay_payment_id, string razorpay_signature);
