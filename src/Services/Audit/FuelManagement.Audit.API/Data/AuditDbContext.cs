using FuelManagement.Audit.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Audit.API.Data;

public class AuditDbContext : DbContext
{
    public AuditDbContext(DbContextOptions<AuditDbContext> options) : base(options) { }
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.EventType).HasMaxLength(50);
            e.Property(x => x.EntityType).HasMaxLength(100);
            e.Property(x => x.ServiceName).HasMaxLength(100);
            // Index for fast querying by entity or user
            e.HasIndex(x => new { x.EntityType, x.EntityId });
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Timestamp);
        });
    }
}
