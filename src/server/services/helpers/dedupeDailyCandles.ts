import type { Candle } from "@/src/server/repositories/candleRepository";

type DayKeyFn = (date: Date) => string;

const defaultKey: DayKeyFn = (date: Date) =>
  `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date
    .getUTCDate()
    .toString()
    .padStart(2, "0")}`;

export function dedupeDailyCandles(candles: Candle[], keyFn: DayKeyFn = defaultKey): Candle[] {
  const result: Candle[] = [];
  const seen = new Set<string>();
  for (const c of candles) {
    const k = keyFn(c.timestamp);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(c);
  }
  return result;
}
