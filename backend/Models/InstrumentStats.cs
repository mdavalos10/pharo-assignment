namespace InstrumentDashboard.Models;

public record InstrumentStats(
    double TotalReturnPercent,
    double DailyVolatilityPercent,
    double MaxDrawdownPercent);
