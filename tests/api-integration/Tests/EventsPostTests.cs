using System.Net;
using System.Net.Http.Json;
using System.Text;
using ApiIntegrationTests.Infrastructure;
using backend.DTOs;
using Xunit;

namespace ApiIntegrationTests.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class EventsPostTests : IAsyncLifetime
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public EventsPostTests(ApiTestFactory factory)
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
    public async Task PostEvent_ValidPayloadWithCustomId_Returns201AndPersistsInUtc()
    {
        var eventId = $"evt-custom-{Guid.NewGuid():N}";
        var payload = new
        {
            eventId,
            machineId = "press-01",
            timestamp = "2026-11-19T12:30:00+02:00",
            severity = "INFO",
            code = "CYCLE_OK",
            message = "Cycle completed.",
        };

        var response = await _client.PostAsJsonAsync("/api/events", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal($"/api/events/{eventId}", response.Headers.Location?.ToString());

        var created = await response.Content.ReadFromJsonAsync<EventDto>(ApiTestFactory.JsonOptions);
        Assert.NotNull(created);
        Assert.Equal(eventId, created.EventId);
        Assert.Equal("press-01", created.MachineId);
        Assert.Equal("INFO", created.Severity);
        Assert.Equal("CYCLE_OK", created.Code);
        Assert.Equal("Cycle completed.", created.Message);
        Assert.Equal("NEW", created.Status);
        Assert.Equal(
            DateTimeOffset.Parse("2026-11-19T10:30:00Z"),
            DateTimeOffset.Parse(created.Timestamp)
        );

        var fetched = await _client.GetFromJsonAsync<EventDto>(
            $"/api/events/{eventId}",
            ApiTestFactory.JsonOptions
        );
        Assert.NotNull(fetched);
        Assert.Equal(created.EventId, fetched.EventId);
        Assert.Equal("NEW", fetched.Status);
    }

    [Fact]
    public async Task PostEvent_ValidPayloadWithoutEventId_GeneratesEventIdAndReturns201()
    {
        var payload = new
        {
            machineId = "cnc-02",
            timestamp = "2026-11-19T11:00:00Z",
            severity = "WARN",
            code = "TEMP_HIGH",
            message = "Spindle temperature elevated.",
        };

        var response = await _client.PostAsJsonAsync("/api/events", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<EventDto>(ApiTestFactory.JsonOptions);
        Assert.NotNull(created);
        Assert.True(Guid.TryParse(created.EventId, out _));
        Assert.Equal("NEW", created.Status);
    }

    [Theory]
    [MemberData(nameof(InvalidEventPayloads))]
    public async Task PostEvent_InvalidPayload_Returns400AndDoesNotPersist(string rawJson)
    {
        using var content = new StringContent(rawJson, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/events", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var page = await _client.GetFromJsonAsync<PaginatedEventsDto>(
            "/api/events",
            ApiTestFactory.JsonOptions
        );
        Assert.NotNull(page);
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task PostEvent_DuplicateEventId_Returns409AndKeepsOriginalRecord()
    {
        var eventId = $"evt-dup-{Guid.NewGuid():N}";
        var first = new
        {
            eventId,
            machineId = "press-01",
            timestamp = "2026-11-19T09:00:00Z",
            severity = "INFO",
            code = "INIT",
            message = "First event.",
        };
        var duplicate = new
        {
            eventId,
            machineId = "press-01",
            timestamp = "2026-11-19T09:05:00Z",
            severity = "WARN",
            code = "INIT",
            message = "Overwritten event.",
        };

        var firstResponse = await _client.PostAsJsonAsync("/api/events", first);
        var duplicateResponse = await _client.PostAsJsonAsync("/api/events", duplicate);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        Assert.Equal("application/problem+json", duplicateResponse.Content.Headers.ContentType?.MediaType);

        var stored = await _client.GetFromJsonAsync<EventDto>(
            $"/api/events/{eventId}",
            ApiTestFactory.JsonOptions
        );
        Assert.NotNull(stored);
        Assert.Equal("First event.", stored.Message);
    }

    public static IEnumerable<object[]> InvalidEventPayloads()
    {
        yield return new object[]
        {
            """{"timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"Missing machineId"}"""
        };
        yield return new object[]
        {
            """{"machineId":"press-01","timestamp":"2026-11-19T10:00:00Z","severity":"TRACE","code":"C1","message":"Bad severity"}"""
        };
        yield return new object[]
        {
            """{"machineId":"press-01","timestamp":"2026-11-19T10:00:00","severity":"INFO","code":"C1","message":"Missing timezone"}"""
        };
        yield return new object[]
        {
            """{"machineId":"press-01","timestamp":"not-a-date","severity":"INFO","code":"C1","message":"Bad timestamp"}"""
        };
        yield return new object[]
        {
            """{"eventId":"   ","machineId":"press-01","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"Blank eventId"}"""
        };
        yield return new object[]
        {
            """{"machineId":"press-01","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"Extra field","status":"RESOLVED"}"""
        };
    }
}
