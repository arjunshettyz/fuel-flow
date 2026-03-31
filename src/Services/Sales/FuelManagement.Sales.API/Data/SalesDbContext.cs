using FuelManagement.Sales.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Sales.API.Data;

public class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options) { }

    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Pump> Pumps => Set<Pump>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.UnitPrice).HasPrecision(10, 2);
            e.Property(x => x.TotalAmount).HasPrecision(12, 2);
            e.Property(x => x.FuelType).HasMaxLength(20);
            e.Property(x => x.PaymentMethod).HasMaxLength(30);
            e.HasOne(x => x.Pump).WithMany(p => p.Transactions)
             .HasForeignKey(x => x.PumpId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Pump>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FuelType).HasMaxLength(20);
        });
    }
}
