import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";

export type CandleValidationResult = {
  ok: boolean;
  count: number;
  firstTs: string | null;
  lastTs: string | null;
  errors: string[];
};

export function validateCandles(candles: CandleDomainModel[], opts?: { expectTimeframeMinutes?: number }): CandleValidationResult {
  if (!Array.isArray(candles)) {
    return { ok: false, count: 0, firstTs: null, lastTs: null, errors: ["not_an_array"] };
  }
  if (candles.length === 0) {
    return { ok: false, count: 0, firstTs: null, lastTs: null, errors: ["empty"] };
  }

  const sorted = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const errors: string[] = [];
  let last = sorted[0].timestamp.getTime();

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i].timestamp.getTime();
    if (current <= last) {
      errors.push("non_monotonic");
      break;
    }
    if (opts?.expectTimeframeMinutes) {
      const deltaMin = Math.round((current - last) / 60000);
      if (deltaMin > opts.expectTimeframeMinutes * 2) {
        errors.push(`gap_${deltaMin}m`);
        break;
      }
    }
    last = current;
  }

  return {
    ok: errors.length === 0,
    count: candles.length,
    firstTs: sorted[0].timestamp.toISOString(),
    lastTs: sorted[sorted.length - 1].timestamp.toISOString(),
    errors,
  };
}
