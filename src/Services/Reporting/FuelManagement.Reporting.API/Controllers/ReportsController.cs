using System.Security.Claims;
using FuelManagement.Reporting.API.Data;
using FuelManagement.Reporting.API.Models;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
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
        var report = new Report
        {
            ReportType = req.ReportType,
            Title = req.Title,
            Format = req.Format,
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

            var fileName = $"{report.ReportType}_{report.Id}.{req.Format.ToLower()}";
            var filePath = Path.Combine(reportsDir, fileName);

            if (req.Format.Equals("Excel", StringComparison.OrdinalIgnoreCase))
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
            report.ErrorMessage = ex.Message;
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
        ws.Cells[5, 1].Value = "Station"; ws.Cells[5, 2].Value = "Fuel Type"; ws.Cells[5, 3].Value = "Litres"; ws.Cells[5, 4].Value = "Revenue (₹)";
        // Sample data rows
        ws.Cells[6, 1].Value = "Station 1"; ws.Cells[6, 2].Value = "Petrol"; ws.Cells[6, 3].Value = 5000; ws.Cells[6, 4].Value = 450000;
        ws.Cells[7, 1].Value = "Station 1"; ws.Cells[7, 2].Value = "Diesel"; ws.Cells[7, 3].Value = 3000; ws.Cells[7, 4].Value = 255000;
        ws.Cells["A1:D7"].AutoFitColumns();
        package.SaveAs(new FileInfo(filePath));
    }

    private static void GeneratePdf(string filePath, Report report)
    {
        using var writer = new PdfWriter(filePath);
        using var pdf = new PdfDocument(writer);
        var doc = new Document(pdf);
        doc.Add(new Paragraph($"Indian Fuel Management System").SetFontSize(18));
        doc.Add(new Paragraph($"Report: {report.Title}").SetFontSize(14));
        doc.Add(new Paragraph($"Type: {report.ReportType}  |  Generated: {report.GeneratedAt:yyyy-MM-dd HH:mm}"));
        doc.Add(new Paragraph("─────────────────────────────────────────────"));
        doc.Add(new Paragraph("Summary Data").SetFontSize(12));
        var table = new Table(4);
        table.AddHeaderCell("Station"); table.AddHeaderCell("Fuel Type");
        table.AddHeaderCell("Litres"); table.AddHeaderCell("Revenue (₹)");
        table.AddCell("Station 1"); table.AddCell("Petrol"); table.AddCell("5000"); table.AddCell("₹4,50,000");
        table.AddCell("Station 1"); table.AddCell("Diesel"); table.AddCell("3000"); table.AddCell("₹2,55,000");
        doc.Add(table);
        doc.Close();
    }
}

public record GenerateReportRequest(string ReportType, string Title, string Format = "PDF", string? Parameters = null);
