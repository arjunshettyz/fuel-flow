namespace FuelManagement.Station.API.Models;

public class FuelStation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public Guid DealerId { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PinCode { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OperatingHours> OperatingHours { get; set; } = new List<OperatingHours>();
}

public class OperatingHours
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StationId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }
    public bool Is24Hours { get; set; } = false;
    public bool IsClosed { get; set; } = false;

    public FuelStation Station { get; set; } = null!;
}
