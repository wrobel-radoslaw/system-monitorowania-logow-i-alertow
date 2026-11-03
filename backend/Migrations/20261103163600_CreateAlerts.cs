using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class CreateAlerts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alerts",
                columns: table => new
                {
                    alert_id = table.Column<string>(type: "text", nullable: false),
                    event_id = table.Column<string>(type: "text", nullable: false),
                    machine_id = table.Column<string>(type: "text", nullable: false),
                    rule_name = table.Column<string>(type: "text", nullable: false),
                    severity = table.Column<string>(type: "text", nullable: false),
                    triggered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    delivery_status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alerts", x => x.alert_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alerts");
        }
    }
}
