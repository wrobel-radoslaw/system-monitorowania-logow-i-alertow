using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.DTOs;

namespace ApiIntegrationTests.Infrastructure;

public sealed record RecordedWebhookCall(
    HttpMethod Method,
    Uri? RequestUri,
    string RawBody,
    WebhookPayload? Payload
);

public sealed class WebhookRecorder
{
    private readonly ConcurrentQueue<RecordedWebhookCall> _calls = new();
    private int _responseStatusCode = (int)HttpStatusCode.OK;
    private int _simulateNetworkFailure;
    private int _simulateTimeout;

    public HttpStatusCode ResponseStatus => (HttpStatusCode)Volatile.Read(ref _responseStatusCode);
    public bool NetworkFailureEnabled => Volatile.Read(ref _simulateNetworkFailure) == 1;
    public bool TimeoutEnabled => Volatile.Read(ref _simulateTimeout) == 1;

    public IReadOnlyCollection<RecordedWebhookCall> Calls => _calls.ToArray();

    public void SetResponseStatus(HttpStatusCode statusCode)
    {
        Interlocked.Exchange(ref _responseStatusCode, (int)statusCode);
        Interlocked.Exchange(ref _simulateNetworkFailure, 0);
        Interlocked.Exchange(ref _simulateTimeout, 0);
    }

    public void SimulateNetworkFailure(bool enabled) => Interlocked.Exchange(ref _simulateNetworkFailure, enabled ? 1 : 0);

    public void SimulateTimeout(bool enabled) { Interlocked.Exchange(ref _simulateTimeout, enabled ? 1 : 0); if (enabled) Interlocked.Exchange(ref _simulateNetworkFailure, 0); }

    public void Clear()
    {
        while (_calls.TryDequeue(out _))
        {
        }
    }

    public void Record(RecordedWebhookCall call)
    {
        _calls.Enqueue(call);
    }
}

public sealed class RecordingWebhookHandler : HttpMessageHandler
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters =
        {
            new JsonStringEnumConverter(allowIntegerValues: false)
        }
    };

    private readonly WebhookRecorder _recorder;

    public RecordingWebhookHandler(WebhookRecorder recorder)
    {
        _recorder = recorder;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var rawBody = request.Content is null
            ? string.Empty
            : await request.Content.ReadAsStringAsync(cancellationToken);

        WebhookPayload? payload = null;
        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            try
            {
                payload = JsonSerializer.Deserialize<WebhookPayload>(rawBody, SerializerOptions);
            }
            catch (JsonException)
            {
            }
        }

        _recorder.Record(new RecordedWebhookCall(
            request.Method,
            request.RequestUri,
            rawBody,
            payload
        ));

        if (_recorder.TimeoutEnabled) throw new TaskCanceledException("Simulated webhook timeout.");
        if (_recorder.NetworkFailureEnabled) throw new HttpRequestException("Simulated webhook outage.");
        return new HttpResponseMessage(_recorder.ResponseStatus);
    }
}
