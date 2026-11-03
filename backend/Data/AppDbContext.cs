
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

    public DbSet<Alert> Alerts => Set<Alert>();

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

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.ToTable("alerts");

            entity.HasKey(a => a.AlertId);

            entity.Property(a => a.AlertId)
                .HasColumnName("alert_id")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(a => a.EventId)
                .HasColumnName("event_id")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(a => a.MachineId)
                .HasColumnName("machine_id")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(a => a.RuleName)
                .HasColumnName("rule_name")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(a => a.Severity)
                .HasColumnName("severity")
                .HasColumnType("text")
                .IsRequired();

            entity.Property(a => a.TriggeredAt)
                .HasColumnName("triggered_at")
                .HasColumnType("timestamp with time zone")
                .IsRequired();

            entity.Property(a => a.DeliveryStatus)
                .HasColumnName("delivery_status")
                .HasColumnType("text")
                .HasDefaultValue("PENDING")
                .IsRequired();
        });
    }
}
