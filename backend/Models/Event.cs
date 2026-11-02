namespace backend.Models;

public class Event
{
    public string EventId { get; set; } = null!;

    public string MachineId { get; set; } = null!;

    public DateTime Timestamp { get; set; }

    public string Severity { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string Message { get; set; } = null!;

    public string Status { get; set; } = "NEW";
}