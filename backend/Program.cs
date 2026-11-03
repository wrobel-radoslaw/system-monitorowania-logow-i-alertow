using Microsoft.EntityFrameworkCore;
using backend.Data;
using System.Globalization;
using Npgsql;
using backend.Models;
using backend.DTOs;

var builder = WebApplication.CreateBuilder(args);

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
    bool validTimestamp = DateTime.TryParseExact(
        request.Timestamp,
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        CultureInfo.InvariantCulture,
        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
        out var timestamp
    );

    if (!validTimestamp)
    {
        return Results.BadRequest(new
        {
            error = "Nieprawidłowy format timestamp. Oczekiwany format: yyyy-MM-ddTHH:mm:ssZ."
        });
    }

    timestamp = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc);

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

app.Run();

