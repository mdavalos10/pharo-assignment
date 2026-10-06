import type { InstrumentData, InstrumentStats, PricePoint } from "../types/instruments";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This instrument could not be found."
        : "Cannot reach the API. Make sure the backend is running on port 5000.",
    );
  }
  return response.json();
}

export function getInstruments(signal?: AbortSignal): Promise<string[]> {
  return getJson<string[]>("/api/instruments", signal);
}

export async function getInstrumentData(
  ticker: string,
  signal?: AbortSignal,
): Promise<InstrumentData> {
  const path = `/api/prices/${encodeURIComponent(ticker)}`;
  const [prices, stats] = await Promise.all([
    getJson<PricePoint[]>(path, signal),
    getJson<InstrumentStats>(`${path}/stats`, signal),
  ]);
  return { ticker, prices, stats };
}
