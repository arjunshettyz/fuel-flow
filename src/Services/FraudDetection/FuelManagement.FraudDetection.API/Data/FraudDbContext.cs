using FuelManagement.FraudDetection.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.FraudDetection.API.Data;

public class FraudDbContext : DbContext
{
    public FraudDbContext(DbContextOptions<FraudDbContext> options) : base(options) { }
    public DbSet<FraudAlert> FraudAlerts => Set<FraudAlert>();
    public DbSet<FraudRule> FraudRules => Set<FraudRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<FraudAlert>(e => { e.HasKey(x => x.Id); e.Property(x => x.Severity).HasMaxLength(20); });
        modelBuilder.Entity<FraudRule>(e => { e.HasKey(x => x.Id); e.HasIndex(x => x.RuleName).IsUnique(); });
    }
}
