import { useEffect, useState } from "react";
import { getInstruments, getInstrumentData } from "./api/instruments";
import type { InstrumentData } from "./types/instruments";
import InstrumentSearch from "./components/InstrumentSearch";
import PriceChart from "./components/PriceChart";
import StatsPanel from "./components/StatsPanel";

export default function App() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [data, setData] = useState<InstrumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true);
    setListError("");
    getInstruments(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setTickers(items);
        setSelected((current) =>
          current.length ? current : items.slice(0, 1),
        );
      })
      .catch((err) => {
        if (err.name !== "AbortError") setListError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData([]);
    if (!selected.length) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    Promise.all(
      selected.map((ticker) => getInstrumentData(ticker, controller.signal)),
    )
      .then((items) => {
        if (!controller.signal.aborted) setData(items);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, retry]);
  function toggle(ticker: string) {
    setSelected((current) =>
      current.includes(ticker)
        ? current.filter((item) => item !== ticker)
        : current.length < 3
          ? [...current, ticker]
          : current,
    );
  }
  return (
    <div className="app">
      <header>
        <div className="brand">
          P<span> / </span>MARKETS
        </div>
        <span className="badge">SYNTHETIC DATA · DAILY CLOSE</span>
      </header>
      <div className="intro">
        <p className="eyebrow">MARKET EXPLORER</p>
        <h1>Instrument dashboard</h1>
        <p>
          Explore daily prices, understand performance, and compare instruments.
        </p>
      </div>
      <main>
        <InstrumentSearch
          tickers={tickers}
          selected={selected}
          loading={listLoading}
          error={listError}
          onToggle={toggle}
          onRetry={() => setRetry((value) => value + 1)}
        />
        <section className="content">
          <PriceChart
            selected={selected}
            data={data}
            loading={loading}
            error={error}
            onRetry={() => setRetry((value) => value + 1)}
          />
          <StatsPanel data={data} />
        </section>
      </main>
      <footer>
        Instrument research workspace{" "}
        <span>React + .NET · Synthetic prices for demonstration</span>
      </footer>
    </div>
  );
}
