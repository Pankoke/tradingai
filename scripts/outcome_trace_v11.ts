import "dotenv/config";
import "tsconfig-paths/register";

import { format } from "node:util";
import { eq } from "drizzle-orm";
import { computeSwingOutcome, parseZone } from "@/src/server/services/outcomeEvaluator";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { getSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { db } from "@/src/server/db/db";
import type { Candle } from "@/src/server/repositories/candleRepository";
import type { Setup } from "@/src/lib/engine/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type OutcomeRow = typeof setupOutcomes.$inferSelect;

async function getOutcomeById(id: string): Promise<OutcomeRow | null> {
  const [row] = await db.select().from(setupOutcomes).where(eq(setupOutcomes.id, id)).limit(1);
  return row ?? null;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return value.toISOString();
}

function summarizeCandles(candles: Candle[], windowBars: number) {
  if (!candles.length) {
    return {
      count: 0,
      from: null,
      to: null,
      first: null,
      last: null,
      medianClose: null,
      medianMid: null,
      minLow: null,
      maxHigh: null,
      hourHistogram: {},
    };
  }
  const ordered = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const window = ordered.slice(0, windowBars);
  const closes: number[] = [];
  const mids: number[] = [];
  const hours: Record<string, number> = {};
  let minLow: number | null = null;
  let maxHigh: number | null = null;
  for (const c of window) {
    const close = Number(c.close);
    const high = Number(c.high);
    const low = Number(c.low);
    if (Number.isFinite(close)) closes.push(close);
    if (Number.isFinite(high) && Number.isFinite(low)) mids.push((high + low) / 2);
    if (minLow === null || low < minLow) minLow = low;
    if (maxHigh === null || high > maxHigh) maxHigh = high;
    const hour = c.timestamp.getUTCHours();
    hours[hour.toString()] = (hours[hour.toString()] ?? 0) + 1;
  }
  const medianClose = closes.length
    ? closes.slice().sort((a, b) => a - b)[Math.floor(closes.length / 2)]
    : null;
  const medianMid = mids.length ? mids.slice().sort((a, b) => a - b)[Math.floor(mids.length / 2)] : null;
  return {
    count: window.length,
    from: ordered[0]?.timestamp.toISOString() ?? null,
    to: window[window.length - 1]?.timestamp.toISOString() ?? null,
    first: ordered[0]
      ? { timestamp: ordered[0].timestamp.toISOString(), ohlc: [ordered[0].open, ordered[0].high, ordered[0].low, ordered[0].close] }
      : null,
    last: window[window.length - 1]
      ? {
          timestamp: window[window.length - 1].timestamp.toISOString(),
          ohlc: [
            window[window.length - 1].open,
            window[window.length - 1].high,
            window[window.length - 1].low,
            window[window.length - 1].close,
          ],
        }
      : null,
    medianClose,
    medianMid,
    minLow,
    maxHigh,
    hourHistogram: hours,
  };
}

function traceCandles(params: {
  candles: Candle[];
  direction: "Long" | "Short";
  tpValue: number;
  slValue: number;
  windowBars: number;
}): Array<{
  index: number;
  timestamp: string;
  high: number;
  low: number;
  tpHit: boolean;
  slHit: boolean;
  note: string | null;
}> {
  const ordered = [...params.candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const window = ordered.slice(0, params.windowBars);
  return window.map((candle, idx) => {
    const high = Number(candle.high);
    const low = Number(candle.low);
    const tpHit = params.direction === "Long" ? high >= params.tpValue : low <= params.tpValue;
    const slHit = params.direction === "Long" ? low <= params.slValue : high >= params.slValue;
    let note: string | null = null;
    if (tpHit && slHit) note = "TP & SL in same candle";
    else if (tpHit) note = "TP touched";
    else if (slHit) note = "SL touched";
    return {
      index: idx + 1,
      timestamp: candle.timestamp.toISOString(),
      high,
      low,
      tpHit,
      slHit,
      note,
    };
  });
}

async function main(): Promise<void> {
  const outcomeId = process.argv.find((arg) => arg.startsWith("--id="))?.replace("--id=", "");
  if (!outcomeId) {
    console.error("Usage: ts-node scripts/outcome_trace_v11.ts --id=<outcomeId>");
    process.exit(1);
  }

  const outcome = await getOutcomeById(outcomeId);
  if (!outcome) {
    console.error(`Outcome not found: ${outcomeId}`);
    process.exit(1);
  }

  const snapshot = await getSnapshotWithItems(outcome.snapshotId);
  const setup: Setup | undefined = snapshot?.setups?.find((s) => s.id === outcome.setupId);
  if (!setup) {
    console.error(`Setup ${outcome.setupId} not found in snapshot ${outcome.snapshotId}`);
    process.exit(1);
  }

  const snapshotTime =
    snapshot?.snapshot.snapshotTime instanceof Date
      ? snapshot.snapshot.snapshotTime
      : new Date(snapshot?.snapshot.snapshotTime ?? outcome.evaluatedAt ?? Date.now());
  const windowBars = outcome.windowBars ?? 10;
  const from = new Date(snapshotTime.getTime() + 1); // exclude setup candle
  const to = new Date(snapshotTime.getTime() + (windowBars + 3) * DAY_MS);
  const candles = await getCandlesForAsset({
    assetId: outcome.assetId,
    timeframe: "1D",
    from,
    to,
  });

  const candleSummary = summarizeCandles(candles, windowBars);

  const tp = parseZone(setup.takeProfit);
  const sl = parseZone(setup.stopLoss);
  const tpThreshold = setup.direction === "Long" ? tp.min ?? tp.max : tp.max ?? tp.min;
  const slThreshold = setup.direction === "Long" ? sl.max ?? sl.min : sl.min ?? sl.max;

  const recomputed = computeSwingOutcome({
    setup: {
      id: setup.id,
      assetId: setup.assetId,
      symbol: setup.symbol,
      direction: setup.direction,
      profile: setup.profile,
      timeframe: setup.timeframe,
      stopLoss: setup.stopLoss,
      takeProfit: setup.takeProfit,
      entryZone: setup.entryZone,
      setupGrade: setup.setupGrade,
      setupType: setup.setupType,
      gradeRationale: setup.gradeRationale,
      noTradeReason: setup.noTradeReason,
      gradeDebugReason: setup.gradeDebugReason,
      snapshotId: setup.snapshotId,
    },
    candles,
    windowBars,
  });

  const trace = tpThreshold !== null && slThreshold !== null
    ? traceCandles({
        candles,
        direction: setup.direction,
        tpValue: tpThreshold,
        slValue: slThreshold,
        windowBars,
      })
    : [];

  const asset = await getAssetById(outcome.assetId);
  const entryNumbers =
    (setup.entryZone ?? "").match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", "."))) ?? [];
  const sortedEntry = entryNumbers.slice().sort((a, b) => a - b);
  const entryMid = sortedEntry.length ? (sortedEntry[0] + sortedEntry[sortedEntry.length - 1]) / 2 : null;
  const refPrice = candleSummary.medianMid ?? candleSummary.medianClose;
  const parseSingle = (value?: string | null): number | null => {
    if (!value) return null;
    const nums = value.match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(",", "."))) ?? [];
    if (!nums.length) return null;
    const sorted = nums.sort((a, b) => a - b);
    return (sorted[0] + sorted[sorted.length - 1]) / 2;
  };
  const slMid = parseSingle(setup.stopLoss);
  const tpMid = parseSingle(setup.takeProfit);

  const summary = {
    outcomeId: outcome.id,
    setupId: outcome.setupId,
    snapshotId: outcome.snapshotId,
    direction: setup.direction,
    stopLoss: setup.stopLoss,
    takeProfit: setup.takeProfit,
    windowBars,
    storedStatus: outcome.outcomeStatus,
    storedOutcomeAt: formatDate(outcome.outcomeAt),
    storedReason: outcome.reason,
    recomputedStatus: recomputed.outcomeStatus,
    recomputedOutcomeAt: formatDate(recomputed.outcomeAt),
    recomputedReason: recomputed.reason,
    candlesLoaded: candles.length,
    snapshotTime: snapshotTime.toISOString(),
    from: from.toISOString(),
    to: to.toISOString(),
    expiryAt: formatDate(new Date(snapshotTime.getTime() + windowBars * DAY_MS)),
    trace,
    assetId: outcome.assetId,
    assetSymbol: asset?.symbol ?? null,
    timeframe: outcome.timeframe,
    candleSummary,
    levelRatios: refPrice
      ? {
          refPrice,
          entryMid,
          stopLoss: setup.stopLoss,
          takeProfit: setup.takeProfit,
          entryToRef: entryMid ? entryMid / refPrice : null,
          slToRef: slMid ? slMid / refPrice : null,
          tpToRef: tpMid ? tpMid / refPrice : null,
        }
      : null,
    levels: {
      entryZone: setup.entryZone ?? null,
      stopLoss: setup.stopLoss ?? null,
      takeProfit: setup.takeProfit ?? null,
    },
  };

  console.log(format("%j", summary));
  console.log("\nTrace (chronologisch, erstes Fenster):");
  for (const step of trace) {
    const marker = step.note ? ` <-- ${step.note}` : "";
    console.log(`#${step.index} ${step.timestamp} high=${step.high} low=${step.low}${marker}`);
  }
}

main().catch((error) => {
  console.error("Outcome trace failed", error);
  process.exit(1);
});
