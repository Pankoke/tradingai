export type CandleTimeframe = "1D" | "4H" | "1H" | "15m" | "1W";

export type CandleRow = {
  id: string;
  assetId: string;
  timeframe: CandleTimeframe;
  timestamp: Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume?: number | string | null;
  source: string;
  createdAt?: Date;
};

export type CandleInsert = Omit<CandleRow, "id" | "createdAt"> & {
  id?: string;
  createdAt?: Date;
};

export type NormalizedCandle = {
  assetId: string;
  timeframe: CandleTimeframe;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  source: string;
};
