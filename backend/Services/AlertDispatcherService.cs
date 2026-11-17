using backend.DTOs;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Text.Json.Serialization;
using backend.Enums;

namespace backend.Services;

public class AlertDispatcherService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AlertDispatcherService> _logger;

    private static readonly JsonSerializerOptions WebhookJsonOptions =
        new(JsonSerializerDefaults.Web)
        {
            Converters =
            {
                new JsonStringEnumConverter()
            }
        };
    public AlertDispatcherService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<AlertDispatcherService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        _logger.LogInformation("Alert dispatcher started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingAlerts(stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while processing pending alerts.");
            }

            await Task.Delay(
                TimeSpan.FromSeconds(2),
                stoppingToken);
        }

        _logger.LogInformation("Alert dispatcher stopped.");
    }

    private async Task ProcessPendingAlerts(
        CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

        var pendingAlerts = await db.Alerts
            .AsNoTracking()
            .Where(a => a.DeliveryStatus == "PENDING")
            .OrderBy(a => a.TriggeredAt)
            .Take(20)
            .ToListAsync(stoppingToken);

        foreach (var alert in pendingAlerts)
        {
            stoppingToken.ThrowIfCancellationRequested();

            // Zarezerwowanie próby.
            // FAILED zapobiega ponownej próbie po restarcie w M2.
            var claimed = await db.Alerts
                .Where(a =>
                    a.AlertId == alert.AlertId &&
                    a.DeliveryStatus == "PENDING")
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(
                            a => a.DeliveryStatus,
                            "FAILED")
                        .SetProperty(
                            a => a.Attempts,
                            a => a.Attempts + 1)
                        .SetProperty(
                            a => a.LastHttpStatus,
                            (int?)null),
                    stoppingToken);

            // Inny dispatcher mógł już przejąć ten alert.
            if (claimed == 0)
            {
                continue;
            }

            await SendAlert(alert, db, stoppingToken);
        }
    }


private async Task SendAlert(
    Alert alert,
    AppDbContext db,
    CancellationToken stoppingToken)
{
    int? httpStatus = null;
    bool success = false;

    try
    {
        var client = _httpClientFactory
            .CreateClient("Webhook");

        var payload = new WebhookPayload
        {
            AlertId = alert.AlertId,
            EventId = alert.EventId,
            MachineId = alert.MachineId,
            RuleName = alert.RuleName,
            Severity = Enum.Parse<Severity>(alert.Severity),
            TriggeredAt = new DateTimeOffset(
                DateTime.SpecifyKind(
                    alert.TriggeredAt,
                    DateTimeKind.Utc))
        };

        using var response = await client.PostAsJsonAsync(
            "",
            payload,
            WebhookJsonOptions,
            stoppingToken);

        httpStatus = (int)response.StatusCode;
        success = response.IsSuccessStatusCode;

        _logger.LogInformation(
            "Webhook response for alert {AlertId}: HTTP {StatusCode}",
            alert.AlertId,
            httpStatus);
    }
    catch (OperationCanceledException)
        when (stoppingToken.IsCancellationRequested)
    {
        throw;
    }
    catch (OperationCanceledException ex)
    {
        _logger.LogWarning(
            ex,
            "Webhook timeout for alert {AlertId}.",
            alert.AlertId);
    }
    catch (HttpRequestException ex)
    {
        _logger.LogWarning(
            ex,
            "Webhook request failed for alert {AlertId}.",
            alert.AlertId);
    }

    await db.Alerts
        .Where(a => a.AlertId == alert.AlertId)
        .ExecuteUpdateAsync(
            setters => setters
                .SetProperty(
                    a => a.DeliveryStatus,
                    success ? "SENT" : "FAILED")
                .SetProperty(
                    a => a.LastHttpStatus,
                    httpStatus),
            stoppingToken);
}
}
