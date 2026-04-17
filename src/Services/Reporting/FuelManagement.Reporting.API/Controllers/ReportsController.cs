using System.Globalization;
using System.Security.Claims;
using FuelManagement.Reporting.API.Data;
using FuelManagement.Reporting.API.Models;
using iText.IO.Font.Constants;
using iText.Kernel.Colors;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Borders;
using iText.Layout.Element;
using iText.Layout.Properties;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;

namespace FuelManagement.Reporting.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
[Produces("application/json")]
public class ReportsController : ControllerBase
{
    private readonly ReportingDbContext _context;
    private readonly IWebHostEnvironment _env;

    public ReportsController(ReportingDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
        ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;
    }

    /// <summary>Get dashboard KPIs summary</summary>
    [HttpGet("dashboard")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(200)]
    public IActionResult Dashboard()
    {
        return Ok(new
        {
            TotalReportsGenerated = _context.Reports.Count(),
            CompletedReports = _context.Reports.Count(r => r.Status == "Completed"),
            PendingReports = _context.Reports.Count(r => r.Status == "Pending"),
            LastGenerated = _context.Reports.OrderByDescending(r => r.GeneratedAt).FirstOrDefault()?.GeneratedAt
        });
    }

    /// <summary>List all reports</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(typeof(List<Report>), 200)]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] string? status)
    {
        var query = _context.Reports.AsQueryable();
        if (!string.IsNullOrEmpty(type)) query = query.Where(r => r.ReportType == type);
        if (!string.IsNullOrEmpty(status)) query = query.Where(r => r.Status == status);
        return Ok(await query.OrderByDescending(r => r.GeneratedAt).ToListAsync());
    }

    /// <summary>Request report generation (PDF or Excel)</summary>
    [HttpPost("generate")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(typeof(Report), 202)]
    public async Task<IActionResult> Generate([FromBody] GenerateReportRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString();

        var normalizedFormat = req.Format.Equals("Excel", StringComparison.OrdinalIgnoreCase)
            ? "Excel"
            : "PDF";

        var report = new Report
        {
            ReportType = req.ReportType,
            Title = req.Title,
            Format = normalizedFormat,
            Parameters = req.Parameters ?? "{}",
            RequestedBy = Guid.Parse(userId),
            Status = "Generating"
        };
        _context.Reports.Add(report);
        await _context.SaveChangesAsync();

        // Generate in background (simplified sync for demo)
        try
        {
            var reportsDir = Path.Combine(_env.ContentRootPath, "GeneratedReports");
            Directory.CreateDirectory(reportsDir);

            var safeReportType = SanitizeFileNamePart(report.ReportType);
            var extension = normalizedFormat == "Excel" ? "xlsx" : "pdf";
            var fileName = $"{safeReportType}_{report.Id}.{extension}";
            var filePath = Path.Combine(reportsDir, fileName);

            if (normalizedFormat == "Excel")
                GenerateExcel(filePath, report);
            else
                GeneratePdf(filePath, report);

            report.FilePath = filePath;
            report.Status = "Completed";
            report.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            report.Status = "Failed";
            report.ErrorMessage = ex.InnerException?.Message ?? ex.Message;
            Console.Error.WriteLine(ex);
        }

        await _context.SaveChangesAsync();
        return Accepted(new { report.Id, report.Status, report.FilePath });
    }

    /// <summary>Download a generated report file</summary>
    [HttpGet("{id:guid}/download")]
    [Authorize(Roles = "Admin,Dealer")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Download(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null || !System.IO.File.Exists(report.FilePath))
            return NotFound(new { message = "Report file not found." });

        var contentType = report.Format == "Excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        var fileName = Path.GetFileName(report.FilePath);
        return PhysicalFile(report.FilePath, contentType, fileName);
    }

    private static void GenerateExcel(string filePath, Report report)
    {
        using var package = new ExcelPackage();
        var ws = package.Workbook.Worksheets.Add("Report");
        ws.Cells[1, 1].Value = "Report Type"; ws.Cells[1, 2].Value = report.ReportType;
        ws.Cells[2, 1].Value = "Title"; ws.Cells[2, 2].Value = report.Title;
        ws.Cells[3, 1].Value = "Generated At"; ws.Cells[3, 2].Value = report.GeneratedAt.ToString("yyyy-MM-dd HH:mm");
        ws.Cells[5, 1].Value = "Station"; ws.Cells[5, 2].Value = "Fuel Type"; ws.Cells[5, 3].Value = "Litres"; ws.Cells[5, 4].Value = "Revenue";

        // Sample preview rows (aligned with the web Preview Data table)
        var rows = GetSamplePreviewRows(report.ReportType);
        for (var i = 0; i < rows.Count; i++)
        {
            var excelRow = 6 + i;
            ws.Cells[excelRow, 1].Value = rows[i].Station;
            ws.Cells[excelRow, 2].Value = rows[i].FuelType;
            ws.Cells[excelRow, 3].Value = rows[i].Litres;
            ws.Cells[excelRow, 4].Value = rows[i].Revenue;
        }

        ws.Cells[$"A1:D{5 + rows.Count + 1}"].AutoFitColumns();
        package.SaveAs(new FileInfo(filePath));
    }

    private static void GeneratePdf(string filePath, Report report)
    {
        using var writer = new PdfWriter(filePath);
        using var pdf = new PdfDocument(writer);
        using var doc = new Document(pdf, iText.Kernel.Geom.PageSize.A4);

        doc.SetMargins(36, 36, 42, 36);

        // Theme colors (mirrors frontend CSS variables in frontend/fuel-management-web/src/styles.scss)
        var ink900 = new DeviceRgb(15, 22, 28);
        var ink500 = new DeviceRgb(91, 99, 108);
        var accentSoft = new DeviceRgb(223, 245, 244); // approx of rgba(24,184,176,0.14) on white
        var borderColor = new DeviceRgb(226, 229, 232); // approx of rgba(16,22,28,0.12) on white

        var regularFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
        var boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

        doc.Add(
            new Paragraph("Fuel Flow")
                .SetFont(boldFont)
                .SetFontSize(11)
                .SetFontColor(ink500)
                .SetMarginTop(0)
                .SetMarginBottom(4));

        doc.Add(
            new Paragraph(report.Title)
                .SetFont(boldFont)
                .SetFontSize(22)
                .SetFontColor(ink900)
                .SetMarginTop(0)
                .SetMarginBottom(10));

        var meta = new Table(UnitValue.CreatePercentArray(new float[] { 1, 1 }))
            .UseAllAvailableWidth()
            .SetBorder(Border.NO_BORDER)
            .SetMarginBottom(14);

        meta.AddCell(
            new Cell()
                .SetBorder(Border.NO_BORDER)
                .Add(
                    new Paragraph($"Report Type: {report.ReportType}")
                        .SetFont(regularFont)
                        .SetFontSize(10)
                        .SetFontColor(ink500)));

        meta.AddCell(
            new Cell()
                .SetBorder(Border.NO_BORDER)
                .SetTextAlignment(TextAlignment.RIGHT)
                .Add(
                    new Paragraph($"Generated: {report.GeneratedAt.ToLocalTime():dd MMM yyyy HH:mm}")
                        .SetFont(regularFont)
                        .SetFontSize(10)
                        .SetFontColor(ink500)));

        doc.Add(meta);

        var card = new Div()
            .SetBorder(new SolidBorder(borderColor, 1))
            .SetPadding(14)
            .SetMarginBottom(10);

        card.Add(
            new Paragraph("Preview Data")
                .SetFont(boldFont)
                .SetFontSize(14)
                .SetFontColor(ink900)
                .SetMarginTop(0)
                .SetMarginBottom(10));

        var table = new Table(UnitValue.CreatePercentArray(new float[] { 3.2f, 2.2f, 1.4f, 2.2f }))
            .UseAllAvailableWidth()
            .SetMarginTop(0)
            .SetBorder(Border.NO_BORDER);

        table.AddHeaderCell(CreateHeaderCell("Station", boldFont, ink900, accentSoft, borderColor));
        table.AddHeaderCell(CreateHeaderCell("Fuel Type", boldFont, ink900, accentSoft, borderColor));
        table.AddHeaderCell(CreateHeaderCell("Litres", boldFont, ink900, accentSoft, borderColor));
        table.AddHeaderCell(CreateHeaderCell("Revenue", boldFont, ink900, accentSoft, borderColor));

        var culture = CultureInfo.GetCultureInfo("en-IN");
        var rows = GetSamplePreviewRows(report.ReportType);
        foreach (var row in rows)
        {
            table.AddCell(CreateBodyCell(row.Station, regularFont, ink900, borderColor));
            table.AddCell(CreateBodyCell(row.FuelType, regularFont, ink900, borderColor));
            table.AddCell(CreateBodyCell(row.Litres.ToString("N0", culture), regularFont, ink900, borderColor));
            table.AddCell(CreateBodyCell(row.Revenue.ToString("C0", culture), regularFont, ink900, borderColor));
        }

        card.Add(table);
        doc.Add(card);

        doc.Add(
            new Paragraph("Generated by Fuel Flow Reporting Service")
                .SetFont(regularFont)
                .SetFontSize(9)
                .SetFontColor(ink500)
                .SetMarginTop(10)
                .SetMarginBottom(0));
    }

    private static Cell CreateHeaderCell(
        string text,
        PdfFont font,
        Color fontColor,
        Color backgroundColor,
        Color borderColor)
    {
        return new Cell()
            .SetBorderTop(Border.NO_BORDER)
            .SetBorderLeft(Border.NO_BORDER)
            .SetBorderRight(Border.NO_BORDER)
            .SetBorderBottom(new SolidBorder(borderColor, 1))
            .SetBackgroundColor(backgroundColor)
            .SetPadding(8)
            .Add(
                new Paragraph(text)
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetFontColor(fontColor));
    }

    private static Cell CreateBodyCell(string text, PdfFont font, Color fontColor, Color borderColor)
    {
        return new Cell()
            .SetBorderTop(Border.NO_BORDER)
            .SetBorderLeft(Border.NO_BORDER)
            .SetBorderRight(Border.NO_BORDER)
            .SetBorderBottom(new SolidBorder(borderColor, 1))
            .SetPadding(8)
            .Add(
                new Paragraph(text)
                    .SetFont(font)
                    .SetFontSize(10)
                    .SetFontColor(fontColor));
    }

    private static IReadOnlyList<PreviewDataRow> GetSamplePreviewRows(string reportType)
    {
        // This service is demo-oriented; keep sample rows consistent across report types.
        return new List<PreviewDataRow>
        {
            new("MG Road", "Petrol", 4200, 409_500),
            new("HSR Sector 2", "Diesel", 3300, 293_800),
            new("Indiranagar", "CNG", 1500, 117_000),
        };
    }

    private sealed record PreviewDataRow(string Station, string FuelType, decimal Litres, decimal Revenue);

    private static string SanitizeFileNamePart(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "report";
        }

        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(value
            .Trim()
            .Select(ch => invalidChars.Contains(ch) ? '_' : ch)
            .ToArray());

        return string.IsNullOrWhiteSpace(sanitized) ? "report" : sanitized;
    }
}

public record GenerateReportRequest(string ReportType, string Title, string Format = "PDF", string? Parameters = null);
