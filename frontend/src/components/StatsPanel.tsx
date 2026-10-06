import type { InstrumentData } from "../types/instruments";
import { colors } from "./chartColors";

const percent = (value: number) => `${value.toFixed(2)}%`;

export default function StatsPanel({ data }: { data: InstrumentData[] }) {
  if (!data.length) return null;
  return (
    <div className="panel stats">
      <h2>Performance at a glance</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Total return</th>
              <th>Daily volatility</th>
              <th>Max drawdown</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ ticker, stats }, index) => (
              <tr key={ticker}>
                <th>
                  <span style={{ color: colors[index] }}>● </span>
                  {ticker}
                </th>
                <td
                  className={
                    stats.totalReturnPercent >= 0 ? "positive" : "negative"
                  }
                >
                  {percent(stats.totalReturnPercent)}
                </td>
                <td>{percent(stats.dailyVolatilityPercent)}</td>
                <td>{percent(stats.maxDrawdownPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Volatility uses population standard deviation of daily returns. Drawdown
        is shown as a positive loss percentage.
      </p>
    </div>
  );
}
