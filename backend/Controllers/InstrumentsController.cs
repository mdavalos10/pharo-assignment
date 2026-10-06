using InstrumentDashboard.Models;
using InstrumentDashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace InstrumentDashboard.Controllers;

[ApiController]
[Route("api")]
public sealed class InstrumentsController : ControllerBase
{
    private readonly IInstrumentService _instruments;

    public InstrumentsController(IInstrumentService instruments)
    {
        _instruments = instruments;
    }

    [HttpGet("instruments")]
    public ActionResult<IEnumerable<string>> GetInstruments() => Ok(_instruments.GetTickers());

    [HttpGet("prices/{ticker}")]
    public ActionResult<IReadOnlyList<PricePoint>> GetPrices(string ticker)
    {
        var prices = _instruments.GetPrices(ticker);
        return prices is null ? NotFound(new { message = $"Unknown ticker: {ticker}" }) : Ok(prices);
    }

    [HttpGet("prices/{ticker}/stats")]
    public ActionResult<InstrumentStats> GetStats(string ticker)
    {
        var stats = _instruments.GetStats(ticker);
        return stats is null ? NotFound(new { message = $"Unknown ticker: {ticker}" }) : Ok(stats);
    }
}
