using System.Net;
using System.Net.Http.Json;
using ApiIntegrationTests.Infrastructure;
using backend.DTOs;
using backend.Enums;
using Xunit;

namespace ApiIntegrationTests.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class AlertRulesTests : IAsyncLifetime
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public AlertRulesTests(ApiTestFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public Task InitializeAsync() => _factory.ResetStateAsync();

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task PostEvent_InfoAndWarn_DoNotCreateErrorCriticalAlert()
    {
        var infoId = $"evt-info-{Guid.NewGuid():N}";
        var warnId = $"evt-warn-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(infoId, "INFO")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(warnId, "WARN")).StatusCode);

        var alerts = await GetAlertsAsync();

        Assert.DoesNotContain(alerts, a => a.EventId == infoId || a.EventId == warnId);
        Assert.DoesNotContain(alerts, a => a.RuleName == "ERROR_CRITICAL");
        Assert.DoesNotContain(
            _factory.WebhookRecorder.Calls,
            c => c.Payload?.EventId == infoId || c.Payload?.EventId == warnId
        );
    }

    [Fact]
    public async Task PostEvent_ErrorAndCritical_CreateErrorCriticalAlerts()
    {
        var errorId = $"evt-err-{Guid.NewGuid():N}";
        var criticalId = $"evt-crit-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(errorId, "ERROR")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(criticalId, "CRITICAL")).StatusCode);

        var alerts = await GetAlertsAsync();

        var errorAlert = Assert.Single(alerts, a => a.EventId == errorId);
        Assert.Equal("ERROR_CRITICAL", errorAlert.RuleName);
        Assert.Equal("ERROR", errorAlert.Severity);
        Assert.Equal("press-01", errorAlert.MachineId);

        var criticalAlert = Assert.Single(alerts, a => a.EventId == criticalId);
        Assert.Equal("ERROR_CRITICAL", criticalAlert.RuleName);
        Assert.Equal("CRITICAL", criticalAlert.Severity);
        Assert.Equal("press-01", criticalAlert.MachineId);
    }

    [Fact]
    public async Task PostEvent_DuplicateCriticalEvent_CreatesOnlyOneAlert()
    {
        var eventId = $"evt-crit-dup-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(eventId, "CRITICAL")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await PostEventAsync(eventId, "CRITICAL")).StatusCode);

        var alerts = await GetAlertsAsync();
        Assert.Single(alerts, a => a.EventId == eventId && a.RuleName == "ERROR_CRITICAL");
    }

    [Fact]
    public async Task AlertDispatcher_DeliversToLocalStubWithoutPublicWebhook()
    {
        _factory.WebhookRecorder.SetResponseStatus(HttpStatusCode.OK);
        var eventId = $"evt-dispatch-ok-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(eventId, "CRITICAL")).StatusCode);

        var deliveredAlert = await WaitForAlertAsync(
            eventId,
            a => a.DeliveryStatus == AlertDeliveryStatus.SENT && a.LastHttpStatus == 200
        );

        Assert.Equal(1, deliveredAlert.Attempts);
        Assert.Equal("ERROR_CRITICAL", deliveredAlert.RuleName);

        var call = Assert.Single(
            _factory.WebhookRecorder.Calls,
            c => c.Payload?.EventId == eventId
        );
        Assert.Equal(HttpMethod.Post, call.Method);
        Assert.NotNull(call.Payload);
        Assert.Equal(deliveredAlert.AlertId, call.Payload.AlertId);
        Assert.Equal("CRITICAL", call.Payload.Severity);
        Assert.Equal("ERROR_CRITICAL", call.Payload.RuleName);
    }

    [Fact]
    public async Task AlertDispatcher_WhenLocalWebhookReturns503_MarksAlertFailedWithStatusCode()
    {
        _factory.WebhookRecorder.SetResponseStatus(HttpStatusCode.ServiceUnavailable);
        var eventId = $"evt-dispatch-503-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(eventId, "ERROR")).StatusCode);

        var failedAlert = await WaitForAlertAsync(
            eventId,
            a => a.DeliveryStatus == AlertDeliveryStatus.FAILED && a.LastHttpStatus == 503
        );

        Assert.Equal(1, failedAlert.Attempts);
        Assert.Contains(
            _factory.WebhookRecorder.Calls,
            c => c.Payload?.EventId == eventId
        );
    }

    [Fact]
    public async Task AlertDispatcher_WhenLocalWebhookUnreachable_MarksAlertFailedWithoutHttpStatus()
    {
        _factory.WebhookRecorder.SimulateNetworkFailure(true);
        var eventId = $"evt-dispatch-down-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await PostEventAsync(eventId, "CRITICAL")).StatusCode);

        var failedAlert = await WaitForAlertAsync(
            eventId,
            a => a.DeliveryStatus == AlertDeliveryStatus.FAILED && a.Attempts == 1
        );

        Assert.Null(failedAlert.LastHttpStatus);
    }

    private Task<HttpResponseMessage> PostEventAsync(string eventId, string severity)
    {
        return _client.PostAsJsonAsync("/api/events", new
        {
            eventId,
            machineId = "press-01",
            timestamp = "2026-11-19T13:00:00Z",
            severity,
            code = $"RULE_{severity}",
            message = $"Rule test for {severity}."
        });
    }

    private async Task<List<AlertDto>> GetAlertsAsync()
    {
        var alerts = await _client.GetFromJsonAsync<List<AlertDto>>(
            "/api/alerts",
            ApiTestFactory.JsonOptions
        );
        Assert.NotNull(alerts);
        return alerts;
    }

    private async Task<AlertDto> WaitForAlertAsync(string eventId, Func<AlertDto, bool> predicate)
    {
        var deadline = DateTime.UtcNow.AddSeconds(8);
        AlertDto? lastSeen = null;

        while (DateTime.UtcNow < deadline)
        {
            var alerts = await GetAlertsAsync();
            lastSeen = alerts.FirstOrDefault(a => a.EventId == eventId);
            if (lastSeen is not null && predicate(lastSeen))
            {
                return lastSeen;
            }

            await Task.Delay(150);
        }

        Assert.Fail(
            $"Alert for {eventId} did not reach expected state within timeout. " +
$"Last state: status={lastSeen?.DeliveryStatus}, attempts={lastSeen?.Attempts}, http={lastSeen?.LastHttpStatus}."
        );
        return null!;
    }
}
