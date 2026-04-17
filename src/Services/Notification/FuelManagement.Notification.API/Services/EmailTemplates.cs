using System.Net;

namespace FuelManagement.Notification.API.Services;

public static class EmailTemplates
{
    private const string Accent = "#18b8b0";
    private const string AccentDark = "#0f8f88";
    private const string Ink = "#0f161c";
    private const string Muted = "#5b636c";
    private const string Paper = "#ffffff";
    private const string Border = "#d6dde2";
    private const string Backdrop = "#eef3f6";

    public static string RenderPriceDropSubscriptionConfirmation(
        string fuelType,
        decimal targetPricePerLitre,
        DateTime subscribedAtUtc)
    {
        var fuel = Html(fuelType);
        var target = FormatInr(targetPricePerLitre);
        var subscribedAt = subscribedAtUtc.ToLocalTime().ToString("dd MMM yyyy, HH:mm");

        return Wrap($@"
            <h1 style=""margin:0;font-size:22px;line-height:1.25;color:{Ink};"">Subscription confirmed</h1>
            <p style=""margin:10px 0 0;color:{Muted};font-size:14px;"">You’ll get an email when <strong>{fuel}</strong> falls below your target.</p>

            <div style=""margin:18px 0 0;border:1px solid {Border};border-radius:16px;background:{Paper};padding:16px;"">
              <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};font-weight:700;"">Alert target</div>
              <div style=""margin-top:8px;font-size:28px;font-weight:800;color:{Ink};"">{target}<span style=""font-size:14px;font-weight:600;color:{Muted};""> / litre</span></div>
              <div style=""margin-top:10px;font-size:13px;color:{Muted};"">Subscribed at {Html(subscribedAt)}</div>
            </div>

            <div style=""margin:18px 0 0;border-radius:14px;background:rgba(24,184,176,0.10);border:1px solid rgba(24,184,176,0.25);padding:14px;"">
              <div style=""font-weight:700;color:{Ink};"">Tip</div>
              <div style=""margin-top:6px;color:{Muted};font-size:13px;"">To test the alert, update Petrol price from the Admin price manager and set it below your target.</div>
            </div>
        ");
    }

    public static string RenderPriceDropAlert(
        string fuelType,
        decimal targetPricePerLitre,
        decimal newPricePerLitre,
        decimal? oldPricePerLitre,
        Guid? stationId,
        DateTime detectedAtUtc)
    {
        var fuel = Html(fuelType);
        var target = FormatInr(targetPricePerLitre);
        var newPrice = FormatInr(newPricePerLitre);
        var oldPrice = oldPricePerLitre.HasValue ? FormatInr(oldPricePerLitre.Value) : null;
        var station = stationId.HasValue && stationId.Value != Guid.Empty ? stationId.Value.ToString() : "Multiple stations";
        var whenLocal = detectedAtUtc.ToLocalTime().ToString("dd MMM yyyy, HH:mm");

        var deltaHtml = oldPrice != null
            ? $"<div style=\"margin-top:10px;color:{Muted};font-size:13px;\">Previous: <strong>{Html(oldPrice)}</strong> / litre</div>"
            : "";

        return Wrap($@"
            <h1 style=""margin:0;font-size:22px;line-height:1.25;color:{Ink};"">Price drop alert</h1>
            <p style=""margin:10px 0 0;color:{Muted};font-size:14px;""><strong>{fuel}</strong> is now below your target.</p>

            <div style=""margin:18px 0 0;border:1px solid {Border};border-radius:16px;background:{Paper};padding:16px;"">
              <div style=""display:flex;gap:12px;flex-wrap:wrap;align-items:baseline;"">
                <div style=""flex:1;min-width:220px;"">
                  <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};font-weight:700;"">Current price</div>
                  <div style=""margin-top:8px;font-size:30px;font-weight:900;color:{Ink};"">{newPrice}<span style=""font-size:14px;font-weight:600;color:{Muted};""> / litre</span></div>
                  {deltaHtml}
                </div>

                <div style=""flex:1;min-width:220px;"">
                  <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};font-weight:700;"">Your target</div>
                  <div style=""margin-top:8px;font-size:22px;font-weight:800;color:{Ink};"">{target}<span style=""font-size:14px;font-weight:600;color:{Muted};""> / litre</span></div>
                  <div style=""margin-top:10px;color:{Muted};font-size:13px;"">Detected at {Html(whenLocal)}</div>
                </div>
              </div>
            </div>

            <div style=""margin:18px 0 0;border-radius:16px;background:linear-gradient(135deg, rgba(24,184,176,0.16), rgba(15,143,136,0.10));border:1px solid rgba(24,184,176,0.22);padding:14px;"">
              <div style=""font-weight:800;color:{Ink};"">Where</div>
              <div style=""margin-top:6px;color:{Muted};font-size:13px;"">Station: {Html(station)}</div>
            </div>
        ");
    }

    public static string RenderPlainTextSubscriptionConfirmation(string fuelType, decimal targetPricePerLitre, DateTime subscribedAtUtc)
    {
        var whenLocal = subscribedAtUtc.ToLocalTime().ToString("dd MMM yyyy, HH:mm");
        return $"Subscription confirmed\n\nFuel: {fuelType}\nTarget: {targetPricePerLitre:0.00} INR / litre\nSubscribed at: {whenLocal}\n\nYou will get an email when the price falls below your target.";
    }

    public static string RenderContactFormSubmission(
        string name,
        string email,
        string phone,
        string message,
        DateTime submittedAtUtc)
    {
        var safeName = Html(name);
        var safeEmail = Html(email);
        var safePhone = string.IsNullOrWhiteSpace(phone) ? "-" : Html(phone);
        var safeMessage = Html(message);
        var submittedAtLocal = submittedAtUtc.ToLocalTime().ToString("dd MMM yyyy, HH:mm");

        return Wrap($@"
            <h1 style=""margin:0;font-size:22px;line-height:1.25;color:{Ink};"">New contact message</h1>
            <p style=""margin:10px 0 0;color:{Muted};font-size:14px;"">You received a message from the Fuel Flow website contact form.</p>

            <div style=""margin:18px 0 0;border:1px solid {Border};border-radius:16px;background:{Paper};padding:16px;"">
              <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};font-weight:700;"">Sender</div>
              <div style=""margin-top:8px;font-size:16px;font-weight:900;color:{Ink};"">{safeName}</div>
              <div style=""margin-top:6px;color:{Muted};font-size:13px;"">{safeEmail}</div>
              <div style=""margin-top:6px;color:{Muted};font-size:13px;"">Phone: {safePhone}</div>
              <div style=""margin-top:6px;color:{Muted};font-size:13px;"">Submitted: {Html(submittedAtLocal)}</div>
            </div>

            <div style=""margin:18px 0 0;border:1px solid {Border};border-radius:16px;background:{Paper};padding:16px;"">
              <div style=""font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};font-weight:700;"">Message</div>
              <div style=""margin-top:10px;color:{Ink};font-size:14px;line-height:1.6;white-space:pre-wrap;"">{safeMessage}</div>
            </div>
        ");
    }

    public static string RenderPlainTextPriceDropAlert(
        string fuelType,
        decimal targetPricePerLitre,
        decimal newPricePerLitre,
        decimal? oldPricePerLitre,
        Guid? stationId,
        DateTime detectedAtUtc)
    {
        var whenLocal = detectedAtUtc.ToLocalTime().ToString("dd MMM yyyy, HH:mm");
        var station = stationId.HasValue && stationId.Value != Guid.Empty ? stationId.Value.ToString() : "Multiple stations";
        var old = oldPricePerLitre.HasValue ? $"\nPrevious: {oldPricePerLitre.Value:0.00} INR / litre" : string.Empty;

        return $"Price drop alert\n\nFuel: {fuelType}\nCurrent: {newPricePerLitre:0.00} INR / litre{old}\nYour target: {targetPricePerLitre:0.00} INR / litre\nStation: {station}\nDetected at: {whenLocal}";
    }

    private static string Wrap(string body)
    {
        return $@"<!doctype html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
  <title>Fuel Flow</title>
</head>
<body style=""margin:0;padding:0;background:{Backdrop};"">
  <div style=""display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"">Fuel Flow notification</div>

  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background:{Backdrop};padding:24px 12px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""600"" cellspacing=""0"" cellpadding=""0"" style=""max-width:600px;width:100%;"">
          <tr>
            <td style=""padding:0 0 14px 0;"">
              <div style=""display:flex;align-items:center;gap:10px;"">
                <div style=""width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,{Accent},{AccentDark});""></div>
                <div>
                  <div style=""font-weight:900;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:{Muted};"">Fuel Flow</div>
                  <div style=""font-weight:700;font-size:12px;color:{Muted};"">Smart fuel management & alerts</div>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style=""background:{Paper};border:1px solid {Border};border-radius:20px;box-shadow:0 10px 26px rgba(16,25,32,0.08);padding:22px;"">
              {body}
            </td>
          </tr>

          <tr>
            <td style=""padding:14px 4px 0 4px;color:{Muted};font-size:12px;line-height:1.5;"">
              You’re receiving this email because you subscribed to alerts in Fuel Flow.
              <br />
              If this wasn’t you, ignore this message.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string Html(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    private static string FormatInr(decimal value) => $"₹{value:0.00}";
}
