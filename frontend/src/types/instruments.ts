export interface PricePoint {
  date: string;
  price: number;
}

export interface InstrumentStats {
  totalReturnPercent: number;
  dailyVolatilityPercent: number;
  maxDrawdownPercent: number;
}

export interface InstrumentData {
  ticker: string;
  prices: PricePoint[];
  stats: InstrumentStats;
}
