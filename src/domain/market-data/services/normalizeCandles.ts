import type { CandleRow } from "@/src/domain/market-data/types";

export type CandleInput = Partial<
  Pick<CandleRow, "timestamp" | "open" | "high" | "low" | "close" | "volume" | "assetId" | "timeframe" | "source">
>;

export function normalizeCandles(inputs: CandleInput[]): CandleRow[] {
  const rows: CandleRow[] = inputs
    .map((input, index) => {
      const timestamp = input.timestamp instanceof Date ? input.timestamp : new Date(input.timestamp ?? 0);
      const open = Number(input.open);
      const high = Number(input.high);
      const low = Number(input.low);
      const close = Number(input.close);
      const volume = input.volume != null ? Number(input.volume) : undefined;

      if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
        return null;
      }

      const row: CandleRow = {
        id: input.assetId ? `${input.assetId}-${timestamp.getTime()}-${index}` : `${timestamp.getTime()}-${index}`,
        assetId: input.assetId ?? "",
        timeframe: input.timeframe ?? "1D",
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        source: input.source ?? "unknown",
      };
      return row;
    })
    .filter((c): c is CandleRow => Boolean(c));

  return rows;
}
