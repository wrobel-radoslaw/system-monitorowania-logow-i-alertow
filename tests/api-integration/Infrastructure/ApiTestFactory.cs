using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Testcontainers.PostgreSql;
using Xunit;

namespace ApiIntegrationTests.Infrastructure;

public sealed class ApiTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .Build();

    public static JsonSerializerOptions JsonOptions { get; } = new(JsonSerializerDefaults.Web)
    {
        Converters =
        {
            new JsonStringEnumConverter(allowIntegerValues: false)
        }
    };

    public WebhookRecorder WebhookRecorder { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(l => l.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning));
        builder.UseSetting("ConnectionStrings:DefaultConnection", _postgres.GetConnectionString());
        builder.UseSetting("Webhook:Url", "http://127.0.0.1/webhook");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));

            services.AddHttpClient("Webhook")
                .ConfigurePrimaryHttpMessageHandler(() => new RecordingWebhookHandler(WebhookRecorder));
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        // Migracja przed startem hosta zapobiega wyścigowi pierwszego ticka AlertDispatcherService.
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        await using var db = new AppDbContext(dbOptions);
        await db.Database.MigrateAsync();
    }

    public async Task ResetStateAsync()
    {
        WebhookRecorder.SetResponseStatus(HttpStatusCode.OK);
        WebhookRecorder.Clear();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync("DELETE FROM alerts; DELETE FROM events;");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}
