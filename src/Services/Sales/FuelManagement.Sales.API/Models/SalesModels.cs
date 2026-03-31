namespace FuelManagement.Sales.API.Models;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StationId { get; set; }
    public Guid PumpId { get; set; }
    public string FuelType { get; set; } = string.Empty;
    public double QuantityLitres { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // Cash | Card | UPI | Wallet
    public string Status { get; set; } = "Completed";   // Pending | Completed | Cancelled | Refunded
    public Guid? CustomerId { get; set; }
    public string CustomerPhone { get; set; } = string.Empty;
    public string RecordedBy { get; set; } = string.Empty; // DealerId
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Pump Pump { get; set; } = null!;
}

public class Pump
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StationId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Pump 1A"
    public string FuelType { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsUnderMaintenance { get; set; } = false;
    public DateTime? LastMaintenance { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
