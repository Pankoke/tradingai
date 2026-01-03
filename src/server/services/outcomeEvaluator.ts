import type { Setup } from "@/src/lib/engine/types";
import type { Candle } from "@/src/server/repositories/candleRepository";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";

export type OutcomeStatus = "open" | "hit_tp" | "hit_sl" | "expired" | "ambiguous" | "invalid";

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
  | "entryZone"
  | "symbol"
  | "snapshotId"
>;

const DAY_MS = 24 * 60 * 60 * 1000;
const ENGINE_VERSION = process.env.SETUP_ENGINE_VERSION ?? "unknown";
const GUARDRAIL_RATIO_MIN = 0.8;
const GUARDRAIL_RATIO_MAX = 1.2;

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

  const ordered = [...params.candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const window = ordered.slice(0, windowBars);
  const usedCandles = window.length;

  // Guardrail: Preis-Skala prüfen (Entry/SL/TP vs Candle-Preis)
  const mids = window
    .map((c) => {
      const high = Number(c.high);
      const low = Number(c.low);
      if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
      return (high + low) / 2;
    })
    .filter((v): v is number => v !== null);
  const medianMid = mids.length ? mids.slice().sort((a, b) => a - b)[Math.floor(mids.length / 2)] : null;
  const refPrice = medianMid ?? (window[0] ? Number(window[0].close) : null);
  const entryNums =
    (params.setup.entryZone ?? "").match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", "."))) ?? [];
  const sortedEntry = entryNums.slice().sort((a, b) => a - b);
  const entryMid = sortedEntry.length ? (sortedEntry[0] + sortedEntry[sortedEntry.length - 1]) / 2 : null;

  if (refPrice && entryMid) {
    const ratio = entryMid / refPrice;
    if (ratio < GUARDRAIL_RATIO_MIN || ratio > GUARDRAIL_RATIO_MAX) {
      const slMid = sl.min ?? sl.max ?? null;
      const tpMid = tp.max ?? tp.min ?? null;
      return {
        outcomeStatus: "invalid",
        outcomeAt: null,
        barsToOutcome: null,
        reason: `price_scale_mismatch entryToRef=${ratio.toFixed(3)} ref=${refPrice.toFixed(2)} entry=${entryMid.toFixed(2)} sl=${slMid ?? "?"} tp=${tpMid ?? "?"} symbol=${params.setup.symbol ?? params.setup.assetId} engine=${ENGINE_VERSION}`,
        usedCandles,
      };
    }
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
        usedCandles,
      };
    }
    if (tpHit) {
      return {
        outcomeStatus: "hit_tp",
        outcomeAt: candle.timestamp,
        barsToOutcome: i + 1,
        reason: null,
        usedCandles,
      };
    }
    if (slHit) {
      return {
        outcomeStatus: "hit_sl",
        outcomeAt: candle.timestamp,
        barsToOutcome: i + 1,
        reason: null,
        usedCandles,
      };
    }
  }

  if (window.length < windowBars) {
    return {
      outcomeStatus: "open",
      outcomeAt: null,
      barsToOutcome: null,
      reason: "insufficient_candles",
      usedCandles,
    };
  }

  return {
    outcomeStatus: "expired",
    outcomeAt: null,
    barsToOutcome: null,
    reason: null,
    usedCandles,
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
