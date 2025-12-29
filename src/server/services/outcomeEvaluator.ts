import type { Setup } from "@/src/lib/engine/types";
import type { Candle } from "@/src/server/repositories/candleRepository";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";

export type OutcomeStatus = "open" | "hit_tp" | "hit_sl" | "expired" | "ambiguous";

export type OutcomeComputationResult = {
  outcomeStatus: OutcomeStatus;
  outcomeAt: Date | null;
  barsToOutcome: number | null;
  reason: string | null;
};

type SwingSetupContext = Pick<
  Setup,
  | "id"
  | "assetId"
  | "direction"
  | "profile"
  | "timeframe"
  | "stopLoss"
  | "takeProfit"
  | "setupGrade"
  | "setupType"
  | "gradeRationale"
  | "noTradeReason"
  | "gradeDebugReason"
  | "snapshotId"
>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseZone(value?: string | null): { min: number | null; max: number | null } {
  if (!value) {
    return { min: null, max: null };
  }
  const matches = value.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches?.length) {
    return { min: null, max: null };
  }
  const numbers = matches
    .map((m) => parseFloat(m.replace(",", ".")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!numbers.length) {
    return { min: null, max: null };
  }
  const min = numbers[0] ?? null;
  const max = numbers[numbers.length - 1] ?? null;
  return { min, max };
}

export function computeSwingOutcome(params: {
  setup: SwingSetupContext;
  candles: Candle[];
  windowBars?: number;
}): OutcomeComputationResult & { usedCandles: number } {
  const windowBars = params.windowBars ?? 10;
  const tp = parseZone(params.setup.takeProfit);
  const sl = parseZone(params.setup.stopLoss);
  const tpThreshold = params.setup.direction === "Long" ? tp.min ?? tp.max : tp.max ?? tp.min;
  const slThreshold = params.setup.direction === "Long" ? sl.max ?? sl.min : sl.min ?? sl.max;

  if (tpThreshold === null || slThreshold === null) {
    return {
      outcomeStatus: "open",
      outcomeAt: null,
      barsToOutcome: null,
      reason: "missing_levels",
      usedCandles: 0,
    };
  }

  const tpValue = tpThreshold;
  const slValue = slThreshold;

  const ordered = [...params.candles].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const window = ordered.slice(0, windowBars);
  if (window.length < windowBars) {
    return {
      outcomeStatus: "open",
      outcomeAt: null,
      barsToOutcome: null,
      reason: "insufficient_candles",
      usedCandles: window.length,
    };
  }

  for (let i = 0; i < window.length; i++) {
    const candle = window[i];
    const high = Number(candle.high);
    const low = Number(candle.low);
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      continue;
    }
    const tpHit =
      params.setup.direction === "Long"
        ? high >= tpValue
        : low <= tpValue;
    const slHit =
      params.setup.direction === "Long"
        ? low <= slValue
        : high >= slValue;

    if (tpHit && slHit) {
      return {
        outcomeStatus: "ambiguous",
        outcomeAt: candle.timestamp,
        barsToOutcome: i + 1,
        reason: "tp_and_sl_same_candle",
        usedCandles: window.length,
      };
    }
    if (tpHit) {
      return {
        outcomeStatus: "hit_tp",
        outcomeAt: candle.timestamp,
        barsToOutcome: i + 1,
        reason: null,
        usedCandles: window.length,
      };
    }
    if (slHit) {
      return {
        outcomeStatus: "hit_sl",
        outcomeAt: candle.timestamp,
        barsToOutcome: i + 1,
        reason: null,
        usedCandles: window.length,
      };
    }
  }

  return {
    outcomeStatus: "expired",
    outcomeAt: null,
    barsToOutcome: null,
    reason: null,
    usedCandles: window.length,
  };
}

export async function evaluateSwingSetupOutcome(params: {
  setup: SwingSetupContext;
  snapshotTime: Date;
  windowBars?: number;
}): Promise<
  OutcomeComputationResult & {
    windowBars: number;
    candleCount: number;
  }
> {
  const windowBars = params.windowBars ?? 10;
  const from = new Date(params.snapshotTime.getTime() + 1); // exclude the setup candle
  const to = new Date(params.snapshotTime.getTime() + (windowBars + 3) * DAY_MS);
  const candles = await getCandlesForAsset({
    assetId: params.setup.assetId,
    timeframe: "1D",
    from,
    to,
  });

  const result = computeSwingOutcome({
    setup: params.setup,
    candles,
    windowBars,
  });

  return {
    ...result,
    windowBars,
    candleCount: candles.length,
  };
}
