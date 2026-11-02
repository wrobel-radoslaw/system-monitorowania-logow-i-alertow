using Microsoft.EntityFrameworkCore;
using backend.Data;
using System.Globalization;
using Npgsql;
using backend.Models;
using backend.DTOs;

var allowedSeverities = new[]
{
    "INFO", "WARN", "ERROR", "CRITICAL"
};

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter(
            allowIntegerValues: false
        )
    );
});

//konfiguracja bazy danych
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if(string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Brak konfiguracji ConnectionStrings:DefaultConnection");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/health", async (
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync(cancellationToken);

        if (!canConnect)
        {
            return Results.Json(new
            {
                status = "unhealthy",
                database = "disconnected"
            }, statusCode: 503);
        }

        await db.Database.ExecuteSqlRawAsync(
            "SELECT 1",
            cancellationToken
        );

        return Results.Ok(new
        {
            status = "healthy",
            database = "connected"
        });
        
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database connection failed.");

        return Results.Json(new
        {
            status = "unhealthy",
            database = "disconnected"
        }, statusCode: 503);
    }
})
    .WithTags("Health")
    .WithSummary("Sprawdza dostępność API i bazy danych");

app.MapPost("/api/events", async (
    CreateEventRequest request,
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
    // Walidacja wymaganych pól
    if (string.IsNullOrWhiteSpace(request.MachineId) ||
        string.IsNullOrWhiteSpace(request.Timestamp) ||
        string.IsNullOrWhiteSpace(request.Severity) ||
        string.IsNullOrWhiteSpace(request.Code) ||
        string.IsNullOrWhiteSpace(request.Message))
    {
        return Results.BadRequest(new
        {
            error = "Wszystkie wymagane pola muszą być uzupełnione."
        });
    }

    // Walidacja severity
    if (!allowedSeverities.Contains(request.Severity))
    {
        return Results.BadRequest(new
        {
            error = "Nieprawidłowy severity. Dozwolone wartości: INFO, WARN, ERROR, CRITICAL."
        });
    }

    // Walidacja identyfikatora
    if (request.EventId != null &&
        string.IsNullOrWhiteSpace(request.EventId))
    {
        return Results.BadRequest(new
        {
            error = "eventId nie może być pusty."
        });
    }

    // Walidacja formatu daty zgodnego z generatorem
    bool validTimestamp = DateTimeOffset.TryParse(
        request.Timestamp,
        CultureInfo.InvariantCulture,
        DateTimeStyles.None,
        out var parsedTimestamp
    );

    if (!validTimestamp ||
        parsedTimestamp.Offset == TimeSpan.Zero &&
        !request.Timestamp.EndsWith("Z", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new
        {
            error = "Nieprawidłowy format timestamp. Oczekiwany ISO 8601 ze strefą czasową."
        });
    }

    DateTime timestamp = parsedTimestamp.UtcDateTime;

    // Generowanie identyfikatora, jeśli nie został podany
    string eventId = request.EventId ?? Guid.NewGuid().ToString("D");

    var newEvent = new Event
    {
        EventId = eventId,
        MachineId = request.MachineId,
        Timestamp = timestamp,
        Severity = request.Severity,
        Code = request.Code,
        Message = request.Message,
        Status = "NEW"
    };

    db.Events.Add(newEvent);

    try
    {
        await db.SaveChangesAsync(cancellationToken);
    }
    catch (DbUpdateException ex) when (
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation)
    {
        return Results.Conflict(new
        {
            error = $"Zdarzenie o eventId '{eventId}' już istnieje."
        });
    }

    var response = new EventDto
    {
        EventId = newEvent.EventId,
        MachineId = newEvent.MachineId,
        Timestamp = newEvent.Timestamp.ToString(
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            CultureInfo.InvariantCulture
        ),
        Severity = newEvent.Severity,
        Code = newEvent.Code,
        Message = newEvent.Message,
        Status = newEvent.Status
    };

    return Results.Created($"/api/events/{eventId}", response);
})
    .WithTags("Events")
    .WithSummary("Tworzy nowe zdarzenie")
    .WithDescription("Tworzy zdarzenie. Identyfikator jest generowany automatycznie, jeśli nie został podany. Status nowego zdarzenia zawsze wynosi NEW.")
    .Produces<EventDto>(StatusCodes.Status201Created)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status409Conflict);

app.MapGet("/api/events", async (
    AppDbContext db,
    string? machineId,
    string? severity,
    string? status,
    DateTimeOffset? from,
    DateTimeOffset? to,
    int page = 1,
    int pageSize = 50) =>
{
    // Walidacja paginacji
    if (page < 1)
    {
        return Results.BadRequest(new
        {
            error = "Numer strony musi być większy od 0."
        });
    }

    if (pageSize < 1 || pageSize > 100)
    {
        return Results.BadRequest(new
        {
            error = "pageSize musi mieścić się w zakresie od 1 do 100."
        });
    }

    // Walidacja severity
    if (severity != null && !allowedSeverities.Contains(severity))
    {
        return Results.BadRequest(new
        {
            error = "Nieprawidłowy severity."
        });
    }

    // Walidacja status
    var allowedStatuses = new[]
    {
        "NEW", "ACKNOWLEDGED", "RESOLVED"
    };

    if (status != null && !allowedStatuses.Contains(status))
    {
        return Results.BadRequest(new
        {
            error = "Nieprawidłowy status."
        });
    }

    // Walidacja zakresu dat
    if (from.HasValue && to.HasValue && from.Value >= to.Value)
    {
        return Results.BadRequest(new
        {
            error = "Data początkowa musi być wcześniejsza od końcowej."
        });
    }

    // Pobranie zdarzeń
    var query = db.Events.AsNoTracking().AsQueryable();

    // Filtrowanie
    if (!string.IsNullOrWhiteSpace(machineId))
    {
        query = query.Where(e => e.MachineId == machineId);
    }

    if (severity != null)
    {
        query = query.Where(e => e.Severity == severity);
    }

    if (status != null)
    {
        query = query.Where(e => e.Status == status);
    }

    if (from.HasValue)
    {
        query = query.Where(e => e.Timestamp >= from.Value.UtcDateTime);
    }

    if (to.HasValue)
    {
        query = query.Where(e => e.Timestamp < to.Value.UtcDateTime);
    }

    // Liczba wszystkich wyników po filtrowaniu
    var totalCount = await query.CountAsync();

    // Paginacja i sortowanie
    var events = await query
        .OrderByDescending(e => e.Timestamp)
        .ThenBy(e => e.EventId)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    // Mapowanie na DTO
    var items = events.Select(e => new EventDto
    {
        EventId = e.EventId,
        MachineId = e.MachineId,
        Timestamp = e.Timestamp.ToString(
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            CultureInfo.InvariantCulture
        ),
        Severity = e.Severity,
        Code = e.Code,
        Message = e.Message,
        Status = e.Status
    }).ToList();

    var response = new PaginatedEventsDto
    {
        Items = items,
        Page = page,
        PageSize = pageSize,
        TotalCount = totalCount,
        TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
    };

    return Results.Ok(response);
});

app.Run();

