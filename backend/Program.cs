using Microsoft.EntityFrameworkCore;
using backend.Data;

var builder = WebApplication.CreateBuilder(args);

//konfiguracja bazy danych
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if(string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Brak konfiguracji ConnectionStrings:DefaultConnection");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services to the container.
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/api/health", async (
    AppDbContext db,
    CancellationToken cancellationToken) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync(cancellationToken);

        if (!canConnect)
        {
            return Results.Json(new
            {
                status = "unhealthy",
                database = "disconnected"
            }, statusCode: 503);
        }

        await db.Database.ExecuteSqlRawAsync(
            "SELECT 1",
            cancellationToken
        );

        return Results.Ok(new
        {
            status = "healthy",
            database = "connected"
        });
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database connection failed.");

        return Results.Json(new
        {
            status = "unhealthy",
            database = "disconnected"
        }, statusCode: 503);
    }
});

app.Run();

