using System.Net;
using System.Text.Json;
using backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ApiIntegrationTests.Tests;

public sealed class DatabaseUnavailableTests : IDisposable
{
    private readonly UnavailableDbFactory _factory = new();
    private readonly HttpClient _client;

    public DatabaseUnavailableTests()
    {
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_WhenDatabaseUnavailable_Returns503Unhealthy()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("unhealthy", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal("disconnected", doc.RootElement.GetProperty("database").GetString());
    }

    [Fact]
    public async Task GetEvents_WhenDatabaseUnavailable_Returns503ProblemDetails()
    {
        var response = await _client.GetAsync("/api/events");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private sealed class UnavailableDbFactory : WebApplicationFactory<Program>
    {
        private const string UnreachableConnection = "Host=127.0.0.1;Port=1;Database=none;Username=none;Timeout=2";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureLogging(l => l.ClearProviders());
            builder.UseSetting("ConnectionStrings:DefaultConnection", UnreachableConnection);
            builder.UseSetting("Webhook:Url", "http://127.0.0.1/webhook");

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
                services.AddDbContext<AppDbContext>(o => o.UseNpgsql(UnreachableConnection));
            });
        }
    }
}
