import "dotenv/config";
import "tsconfig-paths/register";

import { format } from "node:util";
import { eq } from "drizzle-orm";
import { computeSwingOutcome, parseZone } from "@/src/server/services/outcomeEvaluator";
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

  const tp = parseZone(setup.takeProfit);
  const sl = parseZone(setup.stopLoss);
  const tpThreshold = setup.direction === "Long" ? tp.min ?? tp.max : tp.max ?? tp.min;
  const slThreshold = setup.direction === "Long" ? sl.max ?? sl.min : sl.min ?? sl.max;

  const recomputed = computeSwingOutcome({
    setup: {
      id: setup.id,
      assetId: setup.assetId,
      direction: setup.direction,
      profile: setup.profile,
      timeframe: setup.timeframe,
      stopLoss: setup.stopLoss,
      takeProfit: setup.takeProfit,
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
