namespace backend.DTOs;

public class PaginatedEventsDto
{
    public List<EventDto> Items { get; set; } = new();

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }

    public int TotalPages { get; set; }
}