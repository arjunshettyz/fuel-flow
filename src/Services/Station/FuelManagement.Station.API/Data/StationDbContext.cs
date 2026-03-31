using FuelManagement.Station.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Station.API.Data;

public class StationDbContext : DbContext
{
    public StationDbContext(DbContextOptions<StationDbContext> options) : base(options) { }

    public DbSet<FuelStation> Stations => Set<FuelStation>();
    public DbSet<OperatingHours> OperatingHours => Set<OperatingHours>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FuelStation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.LicenseNumber).HasMaxLength(100);
        });

        modelBuilder.Entity<OperatingHours>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Station).WithMany(s => s.OperatingHours)
             .HasForeignKey(x => x.StationId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
