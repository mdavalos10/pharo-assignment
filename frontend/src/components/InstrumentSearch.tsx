import { useState } from "react";

export default function InstrumentSearch({
  tickers,
  selected,
  loading,
  error,
  onToggle,
  onRetry,
}: {
  tickers: string[];
  selected: string[];
  loading: boolean;
  error: string;
  onToggle: (ticker: string) => void;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = tickers.filter((ticker) =>
    ticker.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <aside className="panel">
      <div className="sidebar-title">
        <h2>Instruments</h2>
        <span>{tickers.length}</span>
      </div>
      <label htmlFor="search">Search tickers</label>
      <input
        id="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by ticker…"
      />
      <p className="hint">Select up to 3 to compare · {selected.length}/3</p>
      {loading && <p role="status">Loading instruments…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}
      <div className="ticker-list">
        {filtered.map((ticker) => (
          <label
            className={`ticker ${selected.includes(ticker) ? "active" : ""}`}
            key={ticker}
          >
            <input
              type="checkbox"
              checked={selected.includes(ticker)}
              disabled={selected.length === 3 && !selected.includes(ticker)}
              onChange={() => onToggle(ticker)}
            />
            <span>{ticker}</span>
            <small>Daily</small>
          </label>
        ))}
      </div>
      {!loading && !error && !filtered.length && (
        <p>No matching instruments.</p>
      )}
    </aside>
  );
}
