
namespace backend.Models;

public class Alert
{
    public string AlertId { get; set; } = string.Empty;

    public string EventId { get; set; } = string.Empty;

    public string MachineId { get; set; } = string.Empty;

    public string RuleName { get; set; } = string.Empty;

    public string Severity { get; set; } = string.Empty;

    public DateTime TriggeredAt { get; set; }

    public string DeliveryStatus { get; set; } = "PENDING";
    public int Attempts {get; set;} = 0;
    public int? LastHttpStatus {get; set; }
}
