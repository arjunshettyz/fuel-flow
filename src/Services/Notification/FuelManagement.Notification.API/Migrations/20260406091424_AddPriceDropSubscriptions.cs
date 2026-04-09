using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FuelManagement.Notification.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceDropSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PriceDropSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FuelType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TargetPricePerLitre = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastAlertSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastAlertedPricePerLitre = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceDropSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PriceDropSubscriptions_FuelType",
                table: "PriceDropSubscriptions",
                column: "FuelType");

            migrationBuilder.CreateIndex(
                name: "IX_PriceDropSubscriptions_UserId_FuelType",
                table: "PriceDropSubscriptions",
                columns: new[] { "UserId", "FuelType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PriceDropSubscriptions");
        }
    }
}
