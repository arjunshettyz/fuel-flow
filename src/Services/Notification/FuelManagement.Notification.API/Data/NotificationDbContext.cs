using FuelManagement.Notification.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Notification.API.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options) { }
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<PriceDropSubscription> PriceDropSubscriptions => Set<PriceDropSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<NotificationLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Channel).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(20);
        });

        modelBuilder.Entity<PriceDropSubscription>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.FuelType).HasMaxLength(20);
            e.Property(x => x.TargetPricePerLitre).HasPrecision(10, 2);
            e.Property(x => x.LastAlertedPricePerLitre).HasPrecision(10, 2);

            e.HasIndex(x => new { x.UserId, x.FuelType }).IsUnique();
            e.HasIndex(x => x.FuelType);
        });
    }
}
