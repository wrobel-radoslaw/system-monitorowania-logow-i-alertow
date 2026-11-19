using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ApiIntegrationTests.Infrastructure;
using backend.DTOs;
using backend.Enums;
using Xunit;

namespace ApiIntegrationTests.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class EdgeCasesAndE2ETests : IAsyncLifetime
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public EdgeCasesAndE2ETests(ApiTestFactory factory)
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
    public async Task EndToEnd_FullLifecycle_HealthIngestFilterPatchAlertsAndNoDuplicateDispatch()
    {
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/health")).StatusCode);

        var infoId = $"e2e-info-{Guid.NewGuid():N}";
        var warnId = $"e2e-warn-{Guid.NewGuid():N}";
        var errId = $"e2e-err-{Guid.NewGuid():N}";
        var crit1Id = $"e2e-crit-1-{Guid.NewGuid():N}";
        var crit2Id = $"e2e-crit-2-{Guid.NewGuid():N}";
        var e2eIds = new HashSet<string> { infoId, warnId, errId, crit1Id, crit2Id };

        await CreateEventAsync(infoId, "press-01", "2026-11-19T10:00:00Z", "INFO");
        await CreateEventAsync(warnId, "press-01", "2026-11-19T10:01:00.500Z", "WARN");
        await CreateEventAsync(errId, "cnc-02", "2026-11-19T10:02:00-05:00", "ERROR");
        await CreateEventAsync(crit1Id, "welder-03", "2026-11-19T10:03:00Z", "CRITICAL");
        await CreateEventAsync(crit2Id, "welder-03", "2026-11-19T10:03:00Z", "CRITICAL");

        var all = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events", ApiTestFactory.JsonOptions);
        Assert.NotNull(all);
        Assert.Equal(1, all.Page);
        Assert.Equal(50, all.PageSize);
        Assert.Equal(5, all.TotalCount);
        Assert.Equal(1, all.TotalPages);
        Assert.Equal(new[] { errId, crit1Id, crit2Id, warnId, infoId }, all.Items.Select(x => x.EventId));

        var welderPage1 = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?machineId=welder-03&page=1&pageSize=1", ApiTestFactory.JsonOptions);
        var welderPage2 = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?machineId=welder-03&page=2&pageSize=1", ApiTestFactory.JsonOptions);
        Assert.Equal(2, welderPage1?.TotalCount);
        Assert.Equal(2, welderPage1?.TotalPages);
        Assert.Equal(crit1Id, welderPage1?.Items.Single().EventId);
        Assert.Equal(crit2Id, welderPage2?.Items.Single().EventId);

        var beforePatch = await _client.GetFromJsonAsync<EventDto>($"/api/events/{crit1Id}", ApiTestFactory.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync($"/api/events/{crit1Id}/status", new { expectedStatus = "NEW", status = "ACKNOWLEDGED" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync($"/api/events/{crit1Id}/status", new { expectedStatus = "ACKNOWLEDGED", status = "RESOLVED" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PatchAsJsonAsync($"/api/events/{crit1Id}/status", new { expectedStatus = "RESOLVED", status = "ACKNOWLEDGED" })).StatusCode);

        var afterPatch = await _client.GetFromJsonAsync<EventDto>($"/api/events/{crit1Id}", ApiTestFactory.JsonOptions);
        Assert.NotNull(beforePatch);
        Assert.NotNull(afterPatch);
        Assert.Equal("RESOLVED", afterPatch.Status);
        Assert.Equal(beforePatch.MachineId, afterPatch.MachineId);
        Assert.Equal(beforePatch.Severity, afterPatch.Severity);
        Assert.Equal(beforePatch.Code, afterPatch.Code);
        Assert.Equal(beforePatch.Message, afterPatch.Message);
        Assert.Equal(beforePatch.Timestamp, afterPatch.Timestamp);

        var alertIds = new[] { errId, crit1Id, crit2Id };
        foreach (var id in alertIds)
        {
            var delivered = await WaitForAlertAsync(id, a => a.DeliveryStatus == AlertDeliveryStatus.SENT && a.LastHttpStatus == 200);
            Assert.Equal(1, delivered.Attempts);
            Assert.Equal("ERROR_CRITICAL", delivered.RuleName);
        }

        var alerts = await GetAlertsAsync();
        Assert.Equal(3, alerts.Count);
        Assert.DoesNotContain(alerts, a => a.EventId == infoId || a.EventId == warnId);
        Assert.Equal(alerts.OrderByDescending(a => a.TriggeredAt).ThenBy(a => a.AlertId).Select(a => a.AlertId), alerts.Select(a => a.AlertId));

        var calls = _factory.WebhookRecorder.Calls.Where(c => c.Payload != null && e2eIds.Contains(c.Payload.EventId)).ToList();
        Assert.Equal(3, calls.Count);
        foreach (var call in calls)
        {
            using var doc = JsonDocument.Parse(call.RawBody);
            foreach (var prop in new[] { "alertId", "eventId", "machineId", "ruleName", "severity", "triggeredAt" })
                Assert.True(doc.RootElement.TryGetProperty(prop, out _));
        }

        await Task.Delay(2400);
        var callsAfterNextTick = _factory.WebhookRecorder.Calls.Where(c => c.Payload != null && e2eIds.Contains(c.Payload.EventId)).ToList();
        Assert.Equal(3, callsAfterNextTick.Count);
        Assert.All(await GetAlertsAsync(), a => Assert.Equal(1, a.Attempts));
    }

    [Theory]
    [InlineData("""{"machineId":"   ","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"ok"}""")]
    [InlineData("""{"machineId":"m1","severity":"INFO","code":"C1","message":"ok"}""")]
    [InlineData("""{"machineId":"m1","timestamp":"2026-11-19T10:00:00Z","code":"C1","message":"ok"}""")]
    [InlineData("""{"machineId":"m1","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"   ","message":"ok"}""")]
    [InlineData("""{"machineId":"m1","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"   "}""")]
    [InlineData("""{"machineId":"m1","timestamp":"2026-11-19T10:00:00Z","severity":"error","code":"C1","message":"ok"}""")]
    [InlineData("""{"machineId":""")]
    public async Task PostEvent_EdgeInvalidPayloads_Return400(string rawJson)
    {
        using var content = new StringContent(rawJson, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/events", content);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostEvent_FractionalSecondsAndNegativeOffset_NormalizesToUtc()
    {
        var id = $"evt-tz-{Guid.NewGuid():N}";
        var response = await _client.PostAsJsonAsync("/api/events", new { eventId = id, machineId = "cnc-01", timestamp = "2026-11-19T05:15:30.250-05:00", severity = "INFO", code = "TZ", message = "Offset test" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<EventDto>(ApiTestFactory.JsonOptions);
        Assert.Equal(DateTimeOffset.Parse("2026-11-19T10:15:30.250Z"), DateTimeOffset.Parse(dto!.Timestamp));
    }

    [Fact]
    public async Task PostEvent_ConcurrentDuplicateCriticalEvent_One201One409AndSingleAlert()
    {
        var id = $"evt-post-race-{Guid.NewGuid():N}";
        var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ready = new CountdownEvent(2);
        var tasks = Enumerable.Range(0, 2).Select(_ => Task.Run(async () =>
        {
            using var client = _factory.CreateClient();
            ready.Signal();
            await gate.Task;
            var resp = await client.PostAsJsonAsync("/api/events", new { eventId = id, machineId = "press-01", timestamp = "2026-11-19T12:00:00Z", severity = "CRITICAL", code = "RACE", message = "Dup" });
            return resp.StatusCode;
        })).ToArray();

        Assert.True(ready.Wait(TimeSpan.FromSeconds(5)));
        gate.SetResult();
        var statuses = await Task.WhenAll(tasks);

        Assert.Single(statuses, s => s == HttpStatusCode.Created);
        Assert.Single(statuses, s => s == HttpStatusCode.Conflict);
        Assert.Single(await GetAlertsAsync(), a => a.EventId == id);
    }

    [Fact]
    public async Task GetEvents_EmptyDatabaseAndOutOfRangePage_ReturnValidEnvelopes()
    {
        var empty = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events", ApiTestFactory.JsonOptions);
        Assert.NotNull(empty);
        Assert.Empty(empty.Items);
        Assert.Equal(0, empty.TotalCount);
        Assert.Equal(0, empty.TotalPages);
        Assert.Equal(1, empty.Page);
        Assert.Equal(50, empty.PageSize);

        await CreateEventAsync("evt-only", "press-01", "2026-11-19T09:00:00Z", "INFO");
        var beyond = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?page=5&pageSize=10", ApiTestFactory.JsonOptions);
        Assert.NotNull(beyond);
        Assert.Empty(beyond.Items);
        Assert.Equal(1, beyond.TotalCount);
        Assert.Equal(1, beyond.TotalPages);
        Assert.Equal(5, beyond.Page);
    }

    [Fact]
    public async Task GetEvents_TimeRangeBoundariesAndBlankMachineId_BehaveAsContracted()
    {
        await CreateEventAsync("evt-09", "press-01", "2026-11-19T09:00:00Z", "INFO");
        await CreateEventAsync("evt-10", "press-01", "2026-11-19T10:00:00Z", "INFO");
        await CreateEventAsync("evt-11", "press-01", "2026-11-19T11:00:00Z", "INFO");

        var range = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?from=2026-11-19T09:00:00Z&to=2026-11-19T11:00:00Z", ApiTestFactory.JsonOptions);
        var fromOnly = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?from=2026-11-19T10:00:00Z", ApiTestFactory.JsonOptions);
        var toOnly = await _client.GetFromJsonAsync<PaginatedEventsDto>("/api/events?to=2026-11-19T10:00:00Z", ApiTestFactory.JsonOptions);
        var blankMachine = await _client.GetFromJsonAsync<PaginatedEventsDto>($"/api/events?machineId={Uri.EscapeDataString("   ")}", ApiTestFactory.JsonOptions);

        Assert.Equal(new[] { "evt-10", "evt-09" }, range!.Items.Select(x => x.EventId));
        Assert.Equal(new[] { "evt-11", "evt-10" }, fromOnly!.Items.Select(x => x.EventId));
        Assert.Equal(new[] { "evt-09" }, toOnly!.Items.Select(x => x.EventId));
        Assert.Equal(3, blankMachine!.TotalCount);
    }

    [Theory]
    [InlineData("/api/events?page=214748365&pageSize=100")]
    [InlineData("/api/events?from=2026-11-19T11:00:00Z&to=2026-11-19T10:00:00Z")]
    [InlineData("/api/events?from=not-a-date")]
    [InlineData("/api/events?to=not-a-date")]
    public async Task GetEvents_AdditionalInvalidQueries_Return400(string url)
    {
        var response = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("""{"status":"RESOLVED"}""")]
    [InlineData("""{"expectedStatus":"NEW","status":["RESOLVED"]}""")]
    [InlineData("""{"expectedStatus":"NEW","status":99}""")]
    public async Task PatchStatus_AdditionalInvalidBodies_Return400(string rawJson)
    {
        var id = $"evt-pbad-{Guid.NewGuid():N}";
        await CreateEventAsync(id, "press-01", "2026-11-19T10:00:00Z", "INFO");
        using var content = new StringContent(rawJson, Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PatchAsync($"/api/events/{id}/status", content)).StatusCode);
    }

    [Fact]
    public async Task PatchStatus_ConcurrentAckToResolvedRace_OneWinsAndLoserGets409()
    {
        var id = $"evt-ack-race-{Guid.NewGuid():N}";
        await CreateEventAsync(id, "press-01", "2026-11-19T10:00:00Z", "INFO");
        Assert.Equal(HttpStatusCode.OK, (await _client.PatchAsJsonAsync($"/api/events/{id}/status", new { expectedStatus = "NEW", status = "ACKNOWLEDGED" })).StatusCode);

        var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ready = new CountdownEvent(2);
        var tasks = Enumerable.Range(0, 2).Select(_ => Task.Run(async () =>
        {
            using var client = _factory.CreateClient();
            ready.Signal();
            await gate.Task;
            var resp = await client.PatchAsJsonAsync($"/api/events/{id}/status", new { expectedStatus = "ACKNOWLEDGED", status = "RESOLVED" });
            return resp.StatusCode;
        })).ToArray();

        Assert.True(ready.Wait(TimeSpan.FromSeconds(5)));
        gate.SetResult();
        var statuses = await Task.WhenAll(tasks);

        Assert.Single(statuses, s => s == HttpStatusCode.OK);
        Assert.Single(statuses, s => s == HttpStatusCode.Conflict);
        var stored = await _client.GetFromJsonAsync<EventDto>($"/api/events/{id}", ApiTestFactory.JsonOptions);
        Assert.Equal("RESOLVED", stored?.Status);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest, 400)]
    [InlineData(HttpStatusCode.InternalServerError, 500)]
    public async Task AlertDispatcher_Non2xxResponses_MarkFailedWithExactStatusCode(HttpStatusCode statusCode, int expectedCode)
    {
        _factory.WebhookRecorder.SetResponseStatus(statusCode);
        var id = $"evt-http-{expectedCode}-{Guid.NewGuid():N}";
        await CreateEventAsync(id, "press-01", "2026-11-19T12:00:00Z", "ERROR");

        var failed = await WaitForAlertAsync(id, a => a.DeliveryStatus == AlertDeliveryStatus.FAILED && a.LastHttpStatus == expectedCode);
        Assert.Equal(1, failed.Attempts);
    }

    [Fact]
    public async Task AlertDispatcher_WhenWebhookTimesOut_MarksFailedWithNullHttpStatus()
    {
        _factory.WebhookRecorder.SimulateTimeout(true);
        var id = $"evt-timeout-{Guid.NewGuid():N}";
        await CreateEventAsync(id, "press-01", "2026-11-19T12:00:00Z", "CRITICAL");

        var failed = await WaitForAlertAsync(id, a => a.DeliveryStatus == AlertDeliveryStatus.FAILED && a.Attempts == 1);
        Assert.Null(failed.LastHttpStatus);
    }

    private async Task CreateEventAsync(string eventId, string machineId, string timestamp, string severity)
    {
        var resp = await _client.PostAsJsonAsync("/api/events", new { eventId, machineId, timestamp, severity, code = $"C_{severity}", message = $"Msg {eventId}" });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }

    private async Task<List<AlertDto>> GetAlertsAsync()
    {
        var alerts = await _client.GetFromJsonAsync<List<AlertDto>>("/api/alerts", ApiTestFactory.JsonOptions);
        Assert.NotNull(alerts);
        return alerts;
    }

    private async Task<AlertDto> WaitForAlertAsync(string eventId, Func<AlertDto, bool> predicate)
    {
        var deadline = DateTime.UtcNow.AddSeconds(8);
        AlertDto? last = null;
        while (DateTime.UtcNow < deadline)
        {
            last = (await GetAlertsAsync()).FirstOrDefault(a => a.EventId == eventId);
            if (last is not null && predicate(last)) return last;
            await Task.Delay(150);
        }
        Assert.Fail($"Timeout for {eventId}. Last: status={last?.DeliveryStatus}, attempts={last?.Attempts}, http={last?.LastHttpStatus}");
        return null!;
    }
}
