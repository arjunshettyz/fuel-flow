using FuelManagement.Inventory.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Inventory.API.Data;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }

    public DbSet<FuelTank> Tanks => Set<FuelTank>();
    public DbSet<StockAlert> Alerts => Set<StockAlert>();
    public DbSet<ReplenishmentOrder> ReplenishmentOrders => Set<ReplenishmentOrder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FuelTank>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FuelType).HasMaxLength(20);
            e.Property(x => x.PricePerLitre).HasPrecision(10, 2);
        });

        modelBuilder.Entity<StockAlert>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Tank).WithMany(t => t.Alerts)
             .HasForeignKey(x => x.TankId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReplenishmentOrder>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Tank).WithMany(t => t.ReplenishmentOrders)
             .HasForeignKey(x => x.TankId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
