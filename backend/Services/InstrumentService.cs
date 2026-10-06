using System.Globalization;
using InstrumentDashboard.Models;

namespace InstrumentDashboard.Services;

public sealed class InstrumentService : IInstrumentService
{
    private readonly Dictionary<string, PricePoint[]> _series;

    public InstrumentService(IConfiguration configuration)
    {
        var csvPath = configuration["CsvPath"]
            ?? Path.Combine(AppContext.BaseDirectory, "Data", "prices.csv");
        using var reader = new StreamReader(csvPath);
        if (reader.ReadLine()?.Trim() != "date,ticker,price")
            throw new InvalidDataException("CSV line 1: expected date,ticker,price header.");

        var rows = new List<(string Ticker, PricePoint Point)>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lineNumber = 1;
        while (reader.ReadLine() is { } line)
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cells = line.Split(',');
            if (cells.Length != 3 || string.IsNullOrWhiteSpace(cells[1]))
                throw new InvalidDataException($"CSV line {lineNumber}: expected three columns and a nonempty ticker.");
            if (!DateOnly.TryParseExact(cells[0].Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                throw new InvalidDataException($"CSV line {lineNumber}: invalid date.");
            if (!double.TryParse(cells[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var price)
                || !double.IsFinite(price) || price <= 0)
                throw new InvalidDataException($"CSV line {lineNumber}: price must be positive and finite.");
            var ticker = cells[1].Trim();
            if (!seen.Add($"{ticker}\t{date:yyyy-MM-dd}"))
                throw new InvalidDataException($"CSV line {lineNumber}: duplicate ticker/date.");
            rows.Add((ticker, new PricePoint(date, price)));
        }
        if (rows.Count == 0) throw new InvalidDataException("CSV contains no prices.");
        _series = rows.GroupBy(row => row.Ticker, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key,
                group => group.Select(row => row.Point).OrderBy(point => point.Date).ToArray(),
                StringComparer.OrdinalIgnoreCase);
    }

    public IEnumerable<string> GetTickers() => _series.Keys.OrderBy(ticker => ticker);

    public IReadOnlyList<PricePoint>? GetPrices(string ticker) =>
        _series.TryGetValue(ticker, out var prices) ? Array.AsReadOnly(prices) : null;

    public InstrumentStats? GetStats(string ticker) =>
        _series.TryGetValue(ticker, out var prices) ? ComputeStats(prices) : null;

    private static InstrumentStats ComputeStats(PricePoint[] prices)
    {
        var returns = prices.Zip(prices.Skip(1), (previous, current) => current.Price / previous.Price - 1).ToArray();
        var mean = returns.Length > 0 ? returns.Average() : 0;
        var variance = returns.Length > 0 ? returns.Average(value => Math.Pow(value - mean, 2)) : 0;
        var peak = prices[0].Price;
        var drawdown = 0.0;
        foreach (var point in prices)
        {
            peak = Math.Max(peak, point.Price);
            drawdown = Math.Max(drawdown, 1 - point.Price / peak);
        }
        return new((prices[^1].Price / prices[0].Price - 1) * 100, Math.Sqrt(variance) * 100, drawdown * 100);
    }
}
