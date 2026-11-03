using backend.Enums;

namespace backend.DTOs;

public class AlertDto
{
    public string AlertId { get; set; } = null!;

    public string EventId { get; set; } = null!;

    public string MachineId { get; set; } = null!;

    public string RuleName { get; set; } = null!;

    public Severity Severity { get; set; }

    public DateTimeOffset TriggeredAt { get; set; }

    public AlertDeliveryStatus DeliveryStatus { get; set; }
}