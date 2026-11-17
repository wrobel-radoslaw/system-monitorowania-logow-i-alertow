using backend.Enums;

namespace backend.DTOs;

public class WebhookPayload
{
    public string AlertId { get; set; } = null!;

    public string EventId { get; set; } = null!;

    public string MachineId { get; set; } = null!;

    public string RuleName { get; set; } = null!;

    public string Severity { get; set; } = null!;

    public DateTimeOffset TriggeredAt { get; set; }
}