using FuelManagement.Notification.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Notification.API.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options) { }
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<NotificationLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Channel).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(20);
        });
    }
}
