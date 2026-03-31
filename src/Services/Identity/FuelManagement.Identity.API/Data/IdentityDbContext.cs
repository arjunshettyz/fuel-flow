using FuelManagement.Identity.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FuelManagement.Identity.API.Data;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<EmailOtpToken> EmailOtpTokens => Set<EmailOtpToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailOtpToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.Purpose).HasMaxLength(64);
            entity.Property(e => e.CodeHash).HasMaxLength(200);
            entity.HasIndex(e => new { e.Email, e.Purpose, e.CreatedAt });
        });
    }
}
