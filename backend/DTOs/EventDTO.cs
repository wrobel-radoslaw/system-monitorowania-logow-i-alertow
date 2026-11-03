namespace backend.DTOs;

public class EventDto
{
    public string EventId { get; set; } = null!;

    public string MachineId { get; set; } = null!;

    public string Timestamp { get; set; } = null!;

    public string Severity { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string Message { get; set; } = null!;

    public string Status { get; set; } = "NEW";
}