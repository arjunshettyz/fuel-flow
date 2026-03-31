using FuelManagement.Reporting.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Reporting.API.Data;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options) { }
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Report>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ReportType).HasMaxLength(50);
            e.Property(x => x.Format).HasMaxLength(10);
            e.Property(x => x.Status).HasMaxLength(20);
        });
    }
}
