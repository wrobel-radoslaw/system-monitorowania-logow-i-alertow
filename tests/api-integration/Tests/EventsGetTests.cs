using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ApiIntegrationTests.Infrastructure;
using backend.DTOs;
using Xunit;

namespace ApiIntegrationTests.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class EventsGetTests : IAsyncLifetime
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public EventsGetTests(ApiTestFactory factory)
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
    public async Task GetHealth_Returns200WithConnectedDatabase()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("healthy", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal("connected", doc.RootElement.GetProperty("database").GetString());
    }

    [Fact]
    public async Task GetEvents_FilterBySeverity_ReturnsOnlyMatchingEvents()
    {
        await CreateEventAsync("evt-info", "press-01", "2026-11-19T08:00:00Z", "INFO");
        await CreateEventAsync("evt-warn", "press-01", "2026-11-19T08:01:00Z", "WARN");
        await CreateEventAsync("evt-err-1", "press-02", "2026-11-19T08:02:00Z", "ERROR");
        await CreateEventAsync("evt-err-2", "cnc-01", "2026-11-19T08:03:00Z", "ERROR");
        await CreateEventAsync("evt-crit", "cnc-01", "2026-11-19T08:04:00Z", "CRITICAL");

        var errors = await _client.GetFromJsonAsync<PaginatedEventsDto>(
            "/api/events?severity=ERROR",
            ApiTestFactory.JsonOptions
        );

        Assert.NotNull(errors);
        Assert.Equal(2, errors.TotalCount);
        Assert.Equal(2, errors.Items.Count);
        Assert.All(errors.Items, item => Assert.Equal("ERROR", item.Severity));
        Assert.Equal(new[] { "evt-err-2", "evt-err-1" }, errors.Items.Select(i => i.EventId));
    }

    [Fact]
    public async Task GetEvents_FilterByMachineStatusAndTimeRange_ReturnsExpectedSubset()
    {
        await CreateEventAsync("evt-1", "press-01", "2026-11-19T08:00:00Z", "INFO");
        await CreateEventAsync("evt-2", "press-01", "2026-11-19T09:00:00Z", "WARN");
        await CreateEventAsync("evt-3", "press-01", "2026-11-19T10:00:00Z", "WARN");
        await CreateEventAsync("evt-4", "cnc-01", "2026-11-19T09:30:00Z", "WARN");

        var patchResponse = await _client.PatchAsJsonAsync(
            "/api/events/evt-2/status",
            new { expectedStatus = "NEW", status = "ACKNOWLEDGED" }
        );
        Assert.Equal(HttpStatusCode.OK, patchResponse.StatusCode);

        var url = "/api/events?machineId=press-01&status=ACKNOWLEDGED" +
                  "&from=2026-11-19T09:00:00Z&to=2026-11-19T10:00:00Z";
        var result = await _client.GetFromJsonAsync<PaginatedEventsDto>(url, ApiTestFactory.JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Items);
        Assert.Equal("evt-2", result.Items[0].EventId);
    }

    [Fact]
    public async Task GetEvents_Pagination_ReturnsOrderedDisjointPages()
    {
        await CreateEventAsync("evt-a", "press-01", "2026-11-19T08:01:00Z", "INFO");
        await CreateEventAsync("evt-b", "press-01", "2026-11-19T08:02:00Z", "INFO");
        await CreateEventAsync("evt-c", "press-01", "2026-11-19T08:03:00Z", "INFO");
        await CreateEventAsync("evt-d", "press-01", "2026-11-19T08:04:00Z", "INFO");
        await CreateEventAsync("evt-e", "press-01", "2026-11-19T08:04:00Z", "INFO");

        var page1 = await _client.GetFromJsonAsync<PaginatedEventsDto>(
            "/api/events?page=1&pageSize=2",
            ApiTestFactory.JsonOptions
        );
        var page2 = await _client.GetFromJsonAsync<PaginatedEventsDto>(
            "/api/events?page=2&pageSize=2",
            ApiTestFactory.JsonOptions
        );
        var page3 = await _client.GetFromJsonAsync<PaginatedEventsDto>(
            "/api/events?page=3&pageSize=2",
            ApiTestFactory.JsonOptions
        );

        Assert.NotNull(page1);
        Assert.NotNull(page2);
        Assert.NotNull(page3);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(3, page1.TotalPages);
        Assert.Equal(1, page1.Page);
        Assert.Equal(2, page1.PageSize);

        Assert.Equal(new[] { "evt-d", "evt-e" }, page1.Items.Select(i => i.EventId));
        Assert.Equal(new[] { "evt-c", "evt-b" }, page2.Items.Select(i => i.EventId));
        Assert.Equal(new[] { "evt-a" }, page3.Items.Select(i => i.EventId));
    }

    [Theory]
    [InlineData("/api/events?page=0")]
    [InlineData("/api/events?pageSize=0")]
    [InlineData("/api/events?pageSize=101")]
    [InlineData("/api/events?severity=INVALID")]
    [InlineData("/api/events?status=INVALID")]
    [InlineData("/api/events?from=2026-11-19T10:00:00Z&to=2026-11-19T10:00:00Z")]
    public async Task GetEvents_InvalidQueryParameters_Returns400(string url)
    {
        var response = await _client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task GetEventById_NonExistentEvent_Returns404ProblemDetails()
    {
        var response = await _client.GetAsync("/api/events/missing-event-id-404");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    private async Task CreateEventAsync(string eventId, string machineId, string timestamp, string severity)
    {
        var response = await _client.PostAsJsonAsync("/api/events", new
        {
            eventId,
            machineId,
            timestamp,
            severity,
            code = $"CODE_{severity}",
            message = $"Event {eventId}"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
