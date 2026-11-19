using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.DTOs;
using backend.Enums;
using backend.Models;
using Xunit;

namespace ApiIntegrationTests.Tests;

public sealed class ContractUnitTests
{
    private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) }
    };

    [Fact]
    public void ModelsAndDtos_HaveExpectedDefaults()
    {
        var eventDto = new EventDto();
        var alert = new Alert();

        Assert.Equal("NEW", eventDto.Status);
        Assert.Equal("PENDING", alert.DeliveryStatus);
        Assert.Equal(0, alert.Attempts);
        Assert.Null(alert.LastHttpStatus);
    }

    [Fact]
    public void Enums_MatchOpenApiContractValues()
    {
        Assert.Equal(new[] { "INFO", "WARN", "ERROR", "CRITICAL" }, Enum.GetNames<Severity>());
        Assert.Equal(new[] { "NEW", "ACKNOWLEDGED", "RESOLVED" }, Enum.GetNames<EventStatus>());
        Assert.Equal(new[] { "PENDING", "SENT", "FAILED" }, Enum.GetNames<AlertDeliveryStatus>());
    }

    [Fact]
    public void CreateEventRequest_DisallowsUnmappedJsonMembers()
    {
        const string json = """{"machineId":"m1","timestamp":"2026-11-19T10:00:00Z","severity":"INFO","code":"C1","message":"ok","unknown":"x"}""";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<CreateEventRequest>(json, ApiJsonOptions));
    }

    [Fact]
    public void CreateEventRequest_DataAnnotationsRequireAllMandatoryFields()
    {
        var request = new CreateEventRequest();
        var results = new List<ValidationResult>();
        var valid = Validator.TryValidateObject(request, new ValidationContext(request), results, validateAllProperties: true);

        Assert.False(valid);
        var members = results.SelectMany(r => r.MemberNames).ToHashSet();
        Assert.Contains(nameof(CreateEventRequest.MachineId), members);
        Assert.Contains(nameof(CreateEventRequest.Timestamp), members);
        Assert.Contains(nameof(CreateEventRequest.Severity), members);
        Assert.Contains(nameof(CreateEventRequest.Code), members);
        Assert.Contains(nameof(CreateEventRequest.Message), members);
    }

    [Theory]
    [InlineData("""{"expectedStatus":0,"status":1}""")]
    [InlineData("""{"expectedStatus":"NEW","status":"INVALID"}""")]
    public void StatusChangeRequest_RejectsNumericAndUnknownEnumValues(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<StatusChangeRequest>(json, ApiJsonOptions));
    }

    [Fact]
    public void WebhookPayload_RoundTripsAllContractFields()
    {
        var original = new WebhookPayload
        {
            AlertId = "alrt-1",
            EventId = "evt-1",
            MachineId = "press-01",
            RuleName = "ERROR_CRITICAL",
            Severity = "CRITICAL",
            TriggeredAt = DateTimeOffset.Parse("2026-11-19T12:00:00Z")
        };

        var json = JsonSerializer.Serialize(original, ApiJsonOptions);
        var roundTripped = JsonSerializer.Deserialize<WebhookPayload>(json, ApiJsonOptions);

        Assert.NotNull(roundTripped);
        Assert.Equal(original.AlertId, roundTripped.AlertId);
        Assert.Equal(original.EventId, roundTripped.EventId);
        Assert.Equal(original.MachineId, roundTripped.MachineId);
        Assert.Equal(original.RuleName, roundTripped.RuleName);
        Assert.Equal(original.Severity, roundTripped.Severity);
        Assert.Equal(original.TriggeredAt, roundTripped.TriggeredAt);
    }
}
