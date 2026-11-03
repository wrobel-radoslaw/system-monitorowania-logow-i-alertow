using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Npgsql;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Enums;

var allowedSeverities = new[]
{
    "INFO", "WARN", "ERROR", "CRITICAL"
};

var allowedStatuses = new[]
{
    "NEW", "ACKNOWLEDGED", "RESOLVED"
};

var builder = WebApplication.CreateBuilder(args);

// Konfiguracja JSON
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter(
            allowIntegerValues: false
        )
    );
});

builder.Services.AddProblemDetails();

// Konfiguracja bazy danych
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException(
        "Brak konfiguracji ConnectionStrings:DefaultConnection"
    );
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Konfiguracja HTTP Client dla webhooka
builder.Services.AddHttpClient("Webhook", client =>
{
    client.Timeout = TimeSpan.FromSeconds(5);
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Middleware obsługujący niedostępność bazy danych
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex) when (IsDatabaseUnavailable(ex))
    {
        app.Logger.LogError(
            ex,
            "Database operation failed."
        );

        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode =
                StatusCodes.Status503ServiceUnavailable;

            await Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Service Unavailable",
                detail: "Baza danych jest niedostępna."
            ).ExecuteAsync(context);
        }
    }
});

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// =====================================================
// HEALTH CHECK
// =====================================================

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


// =====================================================
// POST /api/events
// =====================================================

app.MapPost("/api/events", async (
    CreateEventRequest request,
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    CancellationToken cancellationToken) =>
{
    // Walidacja wymaganych pól
    if (string.IsNullOrWhiteSpace(request.MachineId) ||
        string.IsNullOrWhiteSpace(request.Timestamp) ||
        string.IsNullOrWhiteSpace(request.Severity) ||
        string.IsNullOrWhiteSpace(request.Code) ||
        string.IsNullOrWhiteSpace(request.Message))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Wszystkie wymagane pola muszą być uzupełnione."
        );
    }

    // Walidacja eventId
    if (request.EventId != null &&
        string.IsNullOrWhiteSpace(request.EventId))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "eventId nie może być pusty."
        );
    }

    // Walidacja severity
    if (!allowedSeverities.Contains(request.Severity))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Nieprawidłowe severity. Dozwolone wartości: INFO, WARN, ERROR, CRITICAL."
        );
    }

    // Walidacja ISO 8601 ze strefą czasową
    bool hasTimezone = Regex.IsMatch(
        request.Timestamp,
        @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
    );

    bool validTimestamp = DateTimeOffset.TryParse(
        request.Timestamp,
        CultureInfo.InvariantCulture,
        DateTimeStyles.None,
        out var parsedTimestamp
    );

    if (!hasTimezone || !validTimestamp)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Nieprawidłowy format timestamp. Oczekiwany ISO 8601 ze strefą czasową."
        );
    }

    // Konwersja do UTC
    DateTime timestamp = parsedTimestamp.UtcDateTime;

    // Generowanie eventId, jeśli nie został podany
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

    Alert? newAlert = null;

    // Reguła ERROR_CRITICAL
    if (newEvent.Severity == "ERROR" ||
        newEvent.Severity == "CRITICAL")
    {
        newAlert = new Alert
        {
            AlertId = Guid.NewGuid().ToString(),
            EventId = newEvent.EventId,
            MachineId = newEvent.MachineId,
            RuleName = "ERROR_CRITICAL",
            Severity = newEvent.Severity,
            TriggeredAt = DateTime.UtcNow,
            DeliveryStatus = "PENDING"
        };

        db.Alerts.Add(newAlert);
    }

    // Zapis zdarzenia i alertu
    try
    {
        await db.SaveChangesAsync(cancellationToken);
    }
    catch (DbUpdateException ex) when (
        ex.InnerException is PostgresException postgresException &&
        postgresException.SqlState == PostgresErrorCodes.UniqueViolation)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Conflict",
            detail: $"Zdarzenie o eventId '{eventId}' już istnieje."
        );
    }

    // Wysłanie webhooka, jeżeli skonfigurowano adres odbiorcy
    if (newAlert != null)
    {
        string? webhookUrl = builder.Configuration["Webhook:Url"];
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            webhookUrl = builder.Configuration["WEBHOOK_URL"];
        }

        if (!string.IsNullOrWhiteSpace(webhookUrl))
        {
            var payload = new WebhookPayload
            {
                AlertId = newAlert.AlertId,
                EventId = newAlert.EventId,
                MachineId = newAlert.MachineId,
                RuleName = newAlert.RuleName,
                Severity = Enum.Parse<Severity>(newAlert.Severity),
                TriggeredAt = new DateTimeOffset(
                    DateTime.SpecifyKind(
                        newAlert.TriggeredAt,
                        DateTimeKind.Utc
                    )
                )
            };

            try
            {
                if (!Uri.TryCreate(
                    webhookUrl,
                    UriKind.Absolute,
                    out var webhookUri) ||
                    (webhookUri.Scheme != Uri.UriSchemeHttp &&
                     webhookUri.Scheme != Uri.UriSchemeHttps))
                {
                    throw new InvalidOperationException(
                        "Nieprawidłowy adres webhooka."
                    );
                }

                var client = httpClientFactory.CreateClient("Webhook");

                var webhookResponse = await client.PostAsJsonAsync(
                    webhookUri,
                    payload,
                    cancellationToken
                );

                newAlert.DeliveryStatus = webhookResponse.IsSuccessStatusCode
                    ? "SENT"
                    : "FAILED";

                if (!webhookResponse.IsSuccessStatusCode)
                {
                    app.Logger.LogWarning(
                        "Webhook returned status code {StatusCode}.",
                        webhookResponse.StatusCode
                    );
                }
            }
            catch (Exception ex) when (
                ex is HttpRequestException ||
                ex is TaskCanceledException ||
                ex is InvalidOperationException)
            {
                newAlert.DeliveryStatus = "FAILED";

                app.Logger.LogWarning(
                    ex,
                    "Webhook delivery failed."
                );
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }

    // Odpowiedź
    var response = ToEventDTO(newEvent);

    return Results.Created(
        $"/api/events/{eventId}",
        response
    );
})
    .WithTags("Events")
    .WithSummary("Tworzy nowe zdarzenie")
    .WithDescription("Tworzy zdarzenie. Identyfikator jest generowany automatycznie, jeśli nie został podany. Status nowego zdarzenia zawsze wynosi NEW.")
    .Produces<EventDto>(StatusCodes.Status201Created)
    .ProducesProblem(StatusCodes.Status400BadRequest)
    .ProducesProblem(StatusCodes.Status409Conflict)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);


// =====================================================
// GET /api/events
// =====================================================

app.MapGet("/api/events", async (
    AppDbContext db,
    string? machineId,
    string? severity,
    string? status,
    DateTimeOffset? from,
    DateTimeOffset? to,
    int page = 1,
    int pageSize = 50,
    CancellationToken cancellationToken = default) =>
{
    // Walidacja paginacji
    if (page < 1)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Numer strony musi być większy od 0."
        );
    }

    if (pageSize < 1 || pageSize > 100)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "pageSize musi mieścić się w zakresie od 1 do 100."
        );
    }

    long skip = ((long)page - 1) * pageSize;

    if (skip > int.MaxValue)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Numer strony jest zbyt duży."
        );
    }
    // Walidacja severity
    if (severity != null && !allowedSeverities.Contains(severity))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Nieprawidłowy severity."
        );
    }

    // Walidacja status
    if (status != null && !allowedStatuses.Contains(status))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Nieprawidłowy status."
        );
    }

    // Walidacja zakresu dat
    if (from.HasValue && to.HasValue && from.Value >= to.Value)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Bad Request",
            detail: "Data początkowa musi być wcześniejsza od końcowej."
        );
    }

    // Pobranie zdarzeń
    var query = db.Events
        .AsNoTracking()
        .AsQueryable();

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
        query = query.Where(
            e => e.Timestamp >= from.Value.UtcDateTime
        );
    }

    if (to.HasValue)
    {
        query = query.Where(
            e => e.Timestamp < to.Value.UtcDateTime
        );
    }

    // Liczba wyników po filtrowaniu
    var totalCount = await query.CountAsync(cancellationToken);

    // Sortowanie i paginacja
    var events = await query
        .OrderByDescending(e => e.Timestamp)
        .ThenBy(e => e.EventId)
        .Skip((int)skip)
        .Take(pageSize)
        .ToListAsync(cancellationToken);

    // Mapowanie na DTO
    var items = events
        .Select(ToEventDTO)
        .ToList();

    var response = new PaginatedEventsDto
    {
        Items = items,
        Page = page,
        PageSize = pageSize,
        TotalCount = totalCount,
        TotalPages = (int)Math.Ceiling(
            (double)totalCount / pageSize
        )
    };

    return Results.Ok(response);
})
    .WithTags("Events")
    .WithSummary("Pobiera listę zdarzeń")
    .Produces<PaginatedEventsDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status400BadRequest)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);
// =====================================================
// GET /api/events/{eventId}
// =====================================================

app.MapGet("/api/events/{eventId}", async (
    string eventId,
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
    var foundEvent = await db.Events
        .AsNoTracking()
        .FirstOrDefaultAsync(
            e => e.EventId == eventId,
            cancellationToken
        );

    if (foundEvent == null)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Not Found",
            detail: $"Nie znaleziono zdarzenia o eventId '{eventId}'."
        );
    }

    return Results.Ok(ToEventDTO(foundEvent));
})
    .WithTags("Events")
    .WithSummary("Pobiera pojedyncze zdarzenie")
    .Produces<EventDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);


// =====================================================
// PATCH /api/events/{eventId}/status
// =====================================================

app.MapPatch("/api/events/{eventId}/status", async (
    string eventId,
    StatusChangeRequest request,
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
// Walidacja pól
    if (request.ExpectedStatus == null ||
        request.Status == null)
    {
    return Results.Problem(
        statusCode: StatusCodes.Status400BadRequest,
        title: "Bad Request",
        detail: "expectedStatus i status są wymagane."
    );
}

// Walidacja wartości enum
if (!Enum.IsDefined(request.ExpectedStatus.Value))
{
    return Results.Problem(
        statusCode: StatusCodes.Status400BadRequest,
        title: "Bad Request",
        detail: "Nieprawidłowy expectedStatus."
    );
}

if (!Enum.IsDefined(request.Status.Value))
{
    return Results.Problem(
        statusCode: StatusCodes.Status400BadRequest,
        title: "Bad Request",
        detail: "Nieprawidłowy status."
    );
}

// Konwersja enumów na string
string expectedStatus = request.ExpectedStatus.Value.ToString();
string targetStatus = request.Status.Value.ToString();

    // Atomowa aktualizacja tylko wtedy, gdy status jest zgodny
    var updated = await db.Events
        .Where(e =>
            e.EventId == eventId &&
            e.Status == expectedStatus)
        .ExecuteUpdateAsync(
            setters => setters.SetProperty(
                e => e.Status,
                targetStatus
            ),
            cancellationToken
        );

    if (updated == 0)
    {
        var exists = await db.Events
            .AnyAsync(
                e => e.EventId == eventId,
                cancellationToken
            );

        if (!exists)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Not Found",
                detail: "Nie znaleziono zdarzenia."
            );
        }

        return Results.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Conflict",
            detail: "Status zdarzenia został wcześniej zmieniony."
        );
    }

    // Pobranie zaktualizowanego zdarzenia
    var foundEvent = await db.Events
        .AsNoTracking()
        .FirstAsync(
            e => e.EventId == eventId,
            cancellationToken
        );

    return Results.Ok(ToEventDTO(foundEvent));
})
    .WithTags("Events")
    .WithSummary("Zmienia status zdarzenia")
    .Produces<EventDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status400BadRequest)
    .ProducesProblem(StatusCodes.Status404NotFound)
    .ProducesProblem(StatusCodes.Status409Conflict)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

// =====================================================
// GET /api/alerts
// =====================================================

app.MapGet("/api/alerts", async (
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
    var alerts = await db.Alerts
        .AsNoTracking()
        .OrderByDescending(a => a.TriggeredAt)
        .ToListAsync(cancellationToken);

    var response = alerts
        .Select(ToAlertDTO)
        .ToList();

    return Results.Ok(response);
})
    .WithTags("Alerts")
    .WithSummary("Pobiera listę wygenerowanych alertów")
    .Produces<List<AlertDto>>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

// =====================================================
// MAPOWANIE DTO
// =====================================================

static EventDto ToEventDTO(Event e)
{
    return new EventDto
    {
        EventId = e.EventId,
        MachineId = e.MachineId,
        Timestamp = new DateTimeOffset(
            DateTime.SpecifyKind(e.Timestamp, DateTimeKind.Utc)
        ).ToString("O", CultureInfo.InvariantCulture),
        Severity = e.Severity,
        Code = e.Code,
        Message = e.Message,
        Status = e.Status
    };
}

static AlertDto ToAlertDTO(Alert a)
{
    return new AlertDto
    {
        AlertId = a.AlertId,
        EventId = a.EventId,
        MachineId = a.MachineId,
        RuleName = a.RuleName,
        Severity = Enum.Parse<Severity>(a.Severity),
        TriggeredAt = new DateTimeOffset(
            DateTime.SpecifyKind(
                a.TriggeredAt,
                DateTimeKind.Utc
            )
        ),
        DeliveryStatus = Enum.Parse<AlertDeliveryStatus>(
            a.DeliveryStatus
        )
    };
}

// =====================================================
// OBSŁUGA BŁĘDÓW BAZY DANYCH
// =====================================================

static bool IsDatabaseUnavailable(Exception exception)
{
    while (exception != null)
    {
        if (exception is NpgsqlException ||
            exception is TimeoutException)
        {
            return true;
        }

        exception = exception.InnerException!;
    }

    return false;
}

app.Run();
