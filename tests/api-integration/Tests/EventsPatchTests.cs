using System.Net;
using System.Net.Http.Json;
using System.Text;
using ApiIntegrationTests.Infrastructure;
using backend.DTOs;
using Xunit;

namespace ApiIntegrationTests.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class EventsPatchTests : IAsyncLifetime
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public EventsPatchTests(ApiTestFactory factory)
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
    public async Task PatchStatus_AllowedTransitions_Return200AndPersist()
    {
        var event1 = await CreateEventAsync("evt-flow-1");
        var event2 = await CreateEventAsync("evt-flow-2");

        var toAck = await _client.PatchAsJsonAsync(
            $"/api/events/{event1}/status",
            new { expectedStatus = "NEW", status = "ACKNOWLEDGED" }
        );
        Assert.Equal(HttpStatusCode.OK, toAck.StatusCode);
        var ackDto = await toAck.Content.ReadFromJsonAsync<EventDto>(ApiTestFactory.JsonOptions);
        Assert.Equal("ACKNOWLEDGED", ackDto?.Status);

        var toRes = await _client.PatchAsJsonAsync(
            $"/api/events/{event1}/status",
            new { expectedStatus = "ACKNOWLEDGED", status = "RESOLVED" }
        );
        Assert.Equal(HttpStatusCode.OK, toRes.StatusCode);
        var resDto = await toRes.Content.ReadFromJsonAsync<EventDto>(ApiTestFactory.JsonOptions);
        Assert.Equal("RESOLVED", resDto?.Status);

        var directRes = await _client.PatchAsJsonAsync(
$"/api/events/{event2}/status",
            new { expectedStatus = "NEW", status = "RESOLVED" }
        );
        Assert.Equal(HttpStatusCode.OK, directRes.StatusCode);

        var fetched1 = await _client.GetFromJsonAsync<EventDto>($"/api/events/{event1}", ApiTestFactory.JsonOptions);
        var fetched2 = await _client.GetFromJsonAsync<EventDto>($"/api/events/{event2}", ApiTestFactory.JsonOptions);
        Assert.Equal("RESOLVED", fetched1?.Status);
        Assert.Equal("RESOLVED", fetched2?.Status);
    }

    [Fact]
    public async Task PatchStatus_ReversionsAndStaleExpectedStatus_Return409WithoutMutatingState()
    {
        var ackEvent = await CreateEventAsync("evt-ack");
        var resEvent = await CreateEventAsync("evt-res");
        var newEvent = await CreateEventAsync("evt-new");

        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/events/{ackEvent}/status",
                new { expectedStatus = "NEW", status = "ACKNOWLEDGED" }
            )).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.OK,
            (await _client.PatchAsJsonAsync(
                $"/api/events/{resEvent}/status",
                new { expectedStatus = "NEW", status = "RESOLVED" }
            )).StatusCode
        );

        var ackToNew = await _client.PatchAsJsonAsync(
$"/api/events/{ackEvent}/status",
            new { expectedStatus = "ACKNOWLEDGED", status = "NEW" }
        );
        var resToAck = await _client.PatchAsJsonAsync(
            $"/api/events/{resEvent}/status",
            new { expectedStatus = "RESOLVED", status = "ACKNOWLEDGED" }
        );
        var resToNew = await _client.PatchAsJsonAsync(
$"/api/events/{resEvent}/status",
            new { expectedStatus = "RESOLVED", status = "NEW" }
        );
        var staleExpected = await _client.PatchAsJsonAsync(
            $"/api/events/{resEvent}/status",
            new { expectedStatus = "NEW", status = "ACKNOWLEDGED" }
        );
        var selfTransition = await _client.PatchAsJsonAsync(
$"/api/events/{newEvent}/status",
            new { expectedStatus = "NEW", status = "NEW" }
        );

        Assert.Equal(HttpStatusCode.Conflict, ackToNew.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, resToAck.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, resToNew.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, staleExpected.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, selfTransition.StatusCode);

        Assert.Equal("ACKNOWLEDGED", (await GetEventAsync(ackEvent)).Status);
        Assert.Equal("RESOLVED", (await GetEventAsync(resEvent)).Status);
        Assert.Equal("NEW", (await GetEventAsync(newEvent)).Status);
    }

    [Fact]
    public async Task PatchStatus_NonExistentEvent_Returns404ProblemDetails()
    {
        var response = await _client.PatchAsJsonAsync(
            "/api/events/non-existent-patch-404/status",
            new { expectedStatus = "NEW", status = "ACKNOWLEDGED" }
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("""{"expectedStatus":"NEW","status":"UNKNOWN"}""")]
    [InlineData("""{"expectedStatus":"UNKNOWN","status":"RESOLVED"}""")]
    [InlineData("""{"expectedStatus":"NEW","status":1}""")]
    [InlineData("""{}""")]
    [InlineData("""{"expectedStatus":"NEW"}""")]
    public async Task PatchStatus_InvalidStatusOrMissingFields_Returns400(string rawJson)
    {
        var eventId = await CreateEventAsync($"evt-bad-{Guid.NewGuid():N}");

        using var content = new StringContent(rawJson, Encoding.UTF8, "application/json");
        var response = await _client.PatchAsync($"/api/events/{eventId}/status", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("NEW", (await GetEventAsync(eventId)).Status);
    }

    [Fact]
    public async Task PatchStatus_ConcurrentRequestsWithSameExpectedStatus_OneWinsAndLoserGets409()
    {
        for (var round = 0; round < 5; round++)
        {
            var eventId = await CreateEventAsync($"evt-race-{round}");
            var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var ready = new CountdownEvent(2);

            async Task<(HttpStatusCode StatusCode, string TargetStatus)> SendAsync(string targetStatus)
            {
                using var concurrentClient = _factory.CreateClient();
                ready.Signal();
                await gate.Task;

                var response = await concurrentClient.PatchAsJsonAsync(
$"/api/events/{eventId}/status",
                    new { expectedStatus = "NEW", status = targetStatus }
                );

                return (response.StatusCode, targetStatus);
            }

            var taskAck = Task.Run(() => SendAsync("ACKNOWLEDGED"));
            var taskRes = Task.Run(() => SendAsync("RESOLVED"));

            Assert.True(ready.Wait(TimeSpan.FromSeconds(5)));
            gate.SetResult();

            var results = await Task.WhenAll(taskAck, taskRes);
            var winner = Assert.Single(results, r => r.StatusCode == HttpStatusCode.OK);
            var loser = Assert.Single(results, r => r.StatusCode == HttpStatusCode.Conflict);

            Assert.NotEqual(winner.TargetStatus, loser.TargetStatus);
            Assert.Equal(winner.TargetStatus, (await GetEventAsync(eventId)).Status);
        }
    }

    [Fact]
    public async Task PatchStatus_ConcurrentBurst_OnlySingleUpdateSucceeds()
    {
        var eventId = await CreateEventAsync("evt-burst");
        var targets = new[] { "ACKNOWLEDGED", "RESOLVED", "ACKNOWLEDGED", "RESOLVED", "ACKNOWLEDGED", "RESOLVED" };
        var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ready = new CountdownEvent(targets.Length);

        var tasks = targets.Select(target => Task.Run(async () =>
        {
            using var concurrentClient = _factory.CreateClient();
            ready.Signal();
            await gate.Task;

            var response = await concurrentClient.PatchAsJsonAsync(
                $"/api/events/{eventId}/status",
                new { expectedStatus = "NEW", status = target }
            );

            return (response.StatusCode, Target: target);
        })).ToArray();

        Assert.True(ready.Wait(TimeSpan.FromSeconds(5)));
        gate.SetResult();

        var results = await Task.WhenAll(tasks);

        var winner = Assert.Single(results, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Equal(targets.Length - 1, results.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(winner.Target, (await GetEventAsync(eventId)).Status);
    }

    private async Task<string> CreateEventAsync(string eventId)
    {
        var response = await _client.PostAsJsonAsync("/api/events", new
        {
            eventId,
            machineId = "press-01",
            timestamp = "2026-11-19T12:00:00Z",
            severity = "INFO",
            code = "STATUS_TEST",
            message = "Status change test."
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return eventId;
    }

    private async Task<EventDto> GetEventAsync(string eventId)
    {
        var dto = await _client.GetFromJsonAsync<EventDto>(
$"/api/events/{eventId}",
            ApiTestFactory.JsonOptions
        );
        Assert.NotNull(dto);
        return dto;
    }
}
