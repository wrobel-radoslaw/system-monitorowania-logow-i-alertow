using System.ComponentModel.DataAnnotations;
using backend.Enums;

namespace backend.DTOs;

public class StatusChangeRequest
{
    [Required]
    public EventStatus? ExpectedStatus { get; set; }

    [Required]
    public EventStatus? Status { get; set; }
}