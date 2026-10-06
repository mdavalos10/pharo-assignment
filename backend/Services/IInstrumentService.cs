using InstrumentDashboard.Models;

namespace InstrumentDashboard.Services;

public interface IInstrumentService
{
    IEnumerable<string> GetTickers();
    IReadOnlyList<PricePoint>? GetPrices(string ticker);
    InstrumentStats? GetStats(string ticker);
}
