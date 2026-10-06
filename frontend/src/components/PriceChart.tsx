import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { InstrumentData } from "../types/instruments";
import { colors } from "./chartColors";

export default function PriceChart({
  selected,
  data,
  loading,
  error,
  onRetry,
}: {
  selected: string[];
  data: InstrumentData[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [normalized, setNormalized] = useState(false);
  const comparing = selected.length > 1;
  const normalize = comparing && normalized;
  const rows = new Map<
    string,
    { date: string; [key: string]: string | number }
  >();
  data.forEach(({ ticker, prices }) =>
    prices.forEach((point) => {
      if (!rows.has(point.date)) rows.set(point.date, { date: point.date });
      rows.get(point.date)![ticker] = normalize
        ? (point.price / prices[0].price) * 100
        : point.price;
    }),
  );
  const chartData = [...rows.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return (
    <div className="panel chart-panel">
      <div className="chart-heading">
        <div>
          <p className="eyebrow">PRICE HISTORY</p>
          <h2>
            {selected.length ? selected.join(" / ") : "Choose an instrument"}
          </h2>
        </div>
        <span className="badge">30-DAY WINDOW</span>
      </div>
      <p className="hint">
        {normalize
          ? "Normalized performance · first closing price = 100"
          : "Daily closing price · source price units"}
      </p>
      {comparing && (
        <label className="hint">
          <input type="checkbox" checked={normalized} onChange={event => setNormalized(event.target.checked)} />
          Normalize comparison to 100
        </label>
      )}
      {error ? (
        <div className="empty" role="alert">
          <p>{error}</p>
          <button onClick={onRetry}>Try again</button>
        </div>
      ) : loading ? (
        <div className="empty" role="status">
          Loading prices and statistics…
        </div>
      ) : !data.length ? (
        <div className="empty">
          Select an instrument from the list to get started.
        </div>
      ) : (
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, bottom: 10, left: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e9edf3"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => value.slice(5)}
                minTickGap={35}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => value.toFixed(0)}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(value) => Number(value).toFixed(2)} />
              <Legend />
              {data.map(({ ticker }, index) => (
                <Line
                  key={ticker}
                  type="linear"
                  dataKey={ticker}
                  stroke={colors[index]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
