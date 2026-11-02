using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Event> Events => Set<Event>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");

            entity.HasKey(e => e.EventId);

            entity.Property(e => e.EventId)
                .HasColumnName("event_id")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(e => e.MachineId)
                .HasColumnName("machine_id")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(e => e.Timestamp)
                .HasColumnName("timestamp")
                .HasColumnType("timestamp with time zone")
                .IsRequired();

            entity.Property(e => e.Severity)
                .HasColumnName("severity")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(e => e.Code)
                .HasColumnName("code")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(e => e.Message)
                .HasColumnName("message")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("text")
                .HasDefaultValue("NEW")
                .IsRequired();
        });
    }
}