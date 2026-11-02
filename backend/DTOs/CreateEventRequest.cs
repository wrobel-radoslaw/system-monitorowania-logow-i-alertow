using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend.DTOs;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class CreateEventRequest
{
    public string? EventId { get; set; }

    [Required]
    public string MachineId { get; set; } = null!;

    [Required]
    public string Timestamp { get; set; } = null!;

    [Required]
    public string Severity { get; set; } = null!;

    [Required]
    public string Code { get; set; } = null!;

    [Required]
    public string Message { get; set; } = null!;
}