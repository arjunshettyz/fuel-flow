namespace FuelManagement.Inventory.API.Models;

public class FuelTank
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StationId { get; set; }
    public string FuelType { get; set; } = string.Empty; // Petrol | Diesel | CNG | EV
    public double CapacityLitres { get; set; }
    public double CurrentLevelLitres { get; set; }
    public decimal PricePerLitre { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public ICollection<StockAlert> Alerts { get; set; } = new List<StockAlert>();
    public ICollection<ReplenishmentOrder> ReplenishmentOrders { get; set; } = new List<ReplenishmentOrder>();
}

public class StockAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TankId { get; set; }
    public string AlertType { get; set; } = "LowStock"; // LowStock | Critical | Overflow
    public double Threshold { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsTriggered { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FuelTank Tank { get; set; } = null!;
}

public class ReplenishmentOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TankId { get; set; }
    public double QuantityLitres { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | Approved | Delivered | Cancelled
    public string OrderedBy { get; set; } = string.Empty;
    public DateTime OrderedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
    public string Notes { get; set; } = string.Empty;

    public FuelTank Tank { get; set; } = null!;
}
