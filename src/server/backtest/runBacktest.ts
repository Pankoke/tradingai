import { mkdir, writeFile } from "node:fs/promises";
import path from "path";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import type { PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import { getContainer } from "@/src/server/container";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getProfileTimeframes, getTimeframesForAsset, TIMEFRAME_SYNC_WINDOWS } from "@/src/server/marketData/timeframeConfig";
import { resolveProviderSymbolForSource } from "@/src/server/marketData/providerDisplay";
import type { MarketDataSource } from "@/src/server/marketData/MarketDataProvider";
import { getLatestSentimentSnapshotAtOrBefore } from "@/src/server/repositories/sentimentSnapshotRepository";
import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";
import type { CandleTimeframe } from "@/src/domain/market-data/types";
import type {
  ClosedTrade,
  CompletedTrade,
  ExecutedEntry,
  ExecutionCostsConfig,
  OpenPosition,
  OrderIntent,
  OrderSide,
  PositionSide,
  BacktestKpis,
} from "@/src/domain/backtest/types";
import {
  computeBacktestKpis,
  defaultCostsConfig,
  enrichTradesWithPnl,
} from "@/src/server/backtest/kpis";
import { buildBacktestRunKey } from "@/src/server/backtest/runKey";
import { upsertBacktestRun } from "@/src/server/repositories/backtestRunRepository";
import {
  getLatestPerceptionSnapshotIdAtOrBefore,
  listPerceptionSnapshotItemsForAsset,
  mapItemsToSetups,
  getCandleOpenAt,
} from "@/src/server/backtest/perceptionPlayback";

export type BacktestStepResult = {
  asOfIso: string;
  label?: string | null;
  setups?: number;
  score?: number | null;
  topSetup?: {
    id: string;
    grade?: string | null;
    gradeSource?: "engine" | "derived" | "unknown";
    decision?: string | null;
    decisionSource?: "engine" | "grade" | "direction" | "unknown";
    direction?: string | null;
    scoreTotal?: number | null;
    confidence?: number | null;
  } | null;
  setupsSummary?: Array<{
    id: string;
    grade?: string | null;
    gradeSource?: "engine" | "derived" | "unknown";
    decision?: string | null;
    decisionSource?: "engine" | "grade" | "direction" | "unknown";
    direction?: string | null;
    scoreTotal?: number | null;
  }>;
  warnings?: string[];
  sentimentSnapshotFound?: boolean;
  sentimentSnapshotAsOfIso?: string;
  executedEntry?: ExecutedEntry;
  openPosition?: OpenPosition | null;
};

export type BacktestReport = {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  lookbackHours: number;
  steps: BacktestStepResult[];
  summary: BacktestSummary;
  trades?: CompletedTrade[];
  kpis?: BacktestKpis;
};

export type RunBacktestDeps = {
  createDataSource?: (sentiment: SentimentProviderPort) => PerceptionDataSourceDeps;
  buildSnapshot?: (args: { asOf: Date; dataSource: ReturnType<typeof createPerceptionDataSource>; assetFilter?: string[] }) => Promise<PerceptionSnapshot>;
  loadSentimentSnapshot?: (assetId: string, asOf: Date) => Promise<SentimentSnapshotV2 | null>;
  writeReport?: (report: BacktestReport, targetPath: string) => Promise<void>;
  loadPlaybackSetups?: (assetId: string, asOf: Date) => Promise<SetupLike[]>;
  getCandleOpenPrice?: (assetId: string, timeframe: string, timestamp: Date) => Promise<number | null>;
};

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_EXIT_POLICY = { kind: "hold-n-steps", holdSteps: 3, price: "step-open" } as const;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function sanitizeName(value: string) {
  // Remove characters illegal on Windows filesystems.
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export type SetupLike = {
  id: string;
  grade?: string | null;
  setupGrade?: string | null;
  decision?: string | null;
  direction?: string | null;
  balanceScore?: number;
  sentimentScore?: number;
  eventScore?: number;
  biasScore?: number;
  confidence?: number;
  candles?: Array<{ timestamp?: string | Date; open?: number | null }>;
  scoreTotal?: number | null;
};

function hasDecision(value: Partial<SetupLike> | null | undefined): value is { decision: string } {
  return typeof value?.decision === "string" && value.decision.trim().length > 0;
}

function normalizeDecision(decision: string): string | null {
  const trimmed = decision.trim().toLowerCase();
  if (!trimmed) return null;
  if (["no_trade", "no-trade", "notrade", "none", "hold"].includes(trimmed)) return "no-trade";
  if (trimmed === "buy" || trimmed === "long") return "buy";
  if (trimmed === "sell" || trimmed === "short") return "sell";
  return trimmed;
}

function toDecision(
  setup?: Partial<SetupLike> | null,
): { decision: string; decisionSource: "engine" | "grade" | "direction" | "unknown" } {
  if (!setup) return { decision: "unknown", decisionSource: "unknown" };
  const rawDecision = hasDecision(setup) ? setup.decision : null;
  const normalized = rawDecision ? normalizeDecision(rawDecision) : null;
  if (normalized) return { decision: normalized, decisionSource: "engine" };
  const grade = setup.grade ?? setup.setupGrade ?? null;
  if (grade === "NO_TRADE") return { decision: "no-trade", decisionSource: "grade" };
  const dir = setup.direction?.toLowerCase();
  if (dir === "long") return { decision: "buy", decisionSource: "direction" };
  if (dir === "short") return { decision: "sell", decisionSource: "direction" };
  return { decision: "unknown", decisionSource: "unknown" };
}

function toGrade(setup?: Partial<SetupLike> | null): string | null {
  if (!setup) return null;
  if (typeof setup.grade === "string" && setup.grade.trim().length) return setup.grade;
  if (typeof setup.setupGrade === "string" && setup.setupGrade.trim().length) return setup.setupGrade;
  return null;
}

function deriveGradeFromScore(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  return "D";
}

function scoreOf(setup: SetupLike): number | null {
  const candidates = [
    setup.balanceScore,
    setup.sentimentScore,
    setup.eventScore,
    setup.biasScore,
    setup.confidence,
  ].filter((v) => typeof v === "number") as number[];
  if (!candidates.length) return null;
  return candidates[0];
}

function pickTopSetup(setups: SetupLike[]): SetupLike | null {
  if (!setups.length) return null;
  const sorted = [...setups].sort((a, b) => {
    const sa = scoreOf(a);
    const sb = scoreOf(b);
    if (sa == null && sb == null) return 0;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa;
  });
  return sorted[0];
}

type CandleMeta = { maxTimestampMs?: number; openPrice?: number; asOfIso?: string };

function extractCandleMeta(snapshot: unknown, asOfIso: string): CandleMeta {
  const result: CandleMeta = { asOfIso };
  const maybeCandles =
    (snapshot as { candles?: Array<{ timestamp?: string | Date; open?: number | null }> }).candles ??
    (snapshot as { market?: { candles?: Array<{ timestamp?: string | Date; open?: number | null }> } }).market?.candles ??
    [];
  const setups = (snapshot as { setups?: SetupLike[] }).setups ?? [];
  const timestamps: number[] = [];
  const collectCandles = (candles: Array<{ timestamp?: string | Date; open?: number | null }> | undefined) => {
    if (!Array.isArray(candles)) return;
    for (const candle of candles) {
      const rawTs = candle?.timestamp;
      const ts =
        rawTs instanceof Date
          ? rawTs.getTime()
          : typeof rawTs === "string"
            ? new Date(rawTs).getTime()
            : Number.NaN;
      if (!Number.isNaN(ts)) timestamps.push(ts);
      if (result.openPrice == null && typeof candle?.open === "number" && Number.isFinite(candle.open)) {
        result.openPrice = candle.open;
      }
    }
  };

  collectCandles(maybeCandles);
  for (const setup of setups) {
    collectCandles(setup.candles);
  }

  if (timestamps.length) {
    result.maxTimestampMs = Math.max(...timestamps);
  }
  return result;
}

function buildOrderIntent(step: BacktestStepResult, index: number, assetId: string): OrderIntent | null {
  const decision = (step.topSetup?.decision ?? "").toLowerCase();
  if (decision !== "buy" && decision !== "sell") return null;
  const side: OrderSide = decision === "buy" ? "buy" : "sell";
  return {
    assetId,
    side,
    asOfIso: step.asOfIso,
    entryPolicy: "next-step-open",
    stepIndex: index,
    reason: step.topSetup?.decisionSource ?? undefined,
  };
}

function executeEntryAtNextStepOpen(intent: OrderIntent, nextMeta: CandleMeta | undefined): ExecutedEntry {
  if (nextMeta?.openPrice != null && Number.isFinite(nextMeta.openPrice)) {
    const fillIso = nextMeta.asOfIso ?? intent.asOfIso;
    return {
      intent,
      status: "filled",
      fill: {
        fillIso,
        fillPrice: nextMeta.openPrice,
        source: "candle-open-next-step",
      },
    };
  }
  return { intent, status: "unfilled" };
}

function toPositionSide(decision: string): PositionSide | null {
  if (decision === "buy") return "long";
  if (decision === "sell") return "short";
  return null;
}

export type BacktestSummary = {
  totalSteps: number;
  stepsWithTopSetup: number;
  decisionCounts: Record<string, number>;
  gradeCounts: Record<string, number>;
  avgScoreTotal: number | null;
  avgConfidence: number | null;
  minScoreTotal: number | null;
  maxScoreTotal: number | null;
};

export function computeBacktestSummary(steps: BacktestStepResult[]): BacktestSummary {
  const decisionCounts: Record<string, number> = {};
  const gradeCounts: Record<string, number> = {};
  let scoreSum = 0;
  let scoreCount = 0;
  let confSum = 0;
  let confCount = 0;
  let minScore: number | null = null;
  let maxScore: number | null = null;
  let stepsWithTop = 0;

  for (const step of steps) {
    const top = step.topSetup;
    if (top) {
      stepsWithTop += 1;
      const decision = (top.decision ?? "unknown").toLowerCase();
      decisionCounts[decision] = (decisionCounts[decision] ?? 0) + 1;
      const grade = top.grade ?? "unknown";
      gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
      if (typeof top.scoreTotal === "number") {
        scoreSum += top.scoreTotal;
        scoreCount += 1;
        if (minScore == null || top.scoreTotal < minScore) minScore = top.scoreTotal;
        if (maxScore == null || top.scoreTotal > maxScore) maxScore = top.scoreTotal;
      }
      if (typeof top.confidence === "number") {
        confSum += top.confidence;
        confCount += 1;
      }
    }
  }

  return {
    totalSteps: steps.length,
    stepsWithTopSetup: stepsWithTop,
    decisionCounts,
    gradeCounts,
    avgScoreTotal: scoreCount ? scoreSum / scoreCount : null,
    avgConfidence: confCount ? confSum / confCount : null,
    minScoreTotal: minScore,
    maxScoreTotal: maxScore,
  };
}

function buildReportPath(assetId: string, fromIso: string, toIso: string, stepHours: number) {
  const safeAsset = sanitizeName(assetId);
  const safeFrom = sanitizeName(fromIso);
  const safeTo = sanitizeName(toIso);
  return path.join(process.cwd(), "reports", "backtests", safeAsset, `${safeFrom}-${safeTo}-step${stepHours}h.json`);
}

async function ensureDirExists(targetFilePath: string) {
  const dir = path.dirname(targetFilePath);
  await mkdir(dir, { recursive: true });
}

export async function runBacktest(params: {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  lookbackHours?: number;
  timeframeFilter?: CandleTimeframe[];
  costsConfig?: ExecutionCostsConfig;
  exitPolicy?: { kind: "hold-n-steps"; holdSteps: number; price: "step-open" };
  deps?: RunBacktestDeps;
  debug?: boolean;
  snapshotMode?: "live" | "playback";
}): Promise<{ ok: true; reportPath: string; steps: number } | { ok: false; error: string; code: string }> {
  const from = new Date(params.fromIso);
  const to = new Date(params.toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return { ok: false, error: "Invalid from/to range", code: "invalid_range" };
  }
  if (!params.stepHours || params.stepHours <= 0) {
    return { ok: false, error: "stepHours must be positive", code: "invalid_step" };
  }

  const lookbackHours = params.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const snapshotMode = params.snapshotMode ?? "live";

  const loadSentimentSnapshot =
    params.deps?.loadSentimentSnapshot ?? ((assetId: string, asOf: Date) => getLatestSentimentSnapshotAtOrBefore(assetId, asOf));

  let lastSentimentFound = false;
  let lastSentimentIso: string | undefined;

  const sentimentPort: SentimentProviderPort = {
    fetchSentiment: async ({ assetId, asOf }) => {
      const snap = await loadSentimentSnapshot(assetId, asOf);
      if (snap) {
        lastSentimentFound = true;
        lastSentimentIso = snap.asOfIso;
        return snap;
      }
      const iso = asOf.toISOString();
      return {
        assetId,
        asOfIso: iso,
        window: { fromIso: new Date(asOf.getTime() - lookbackHours * 60 * 60 * 1000).toISOString(), toIso: iso },
        sources: [{ sourceId: "backfill-fallback", updatedAtIso: iso }],
        components: { polarityScore: 0, confidence: 0 },
        meta: { warnings: "sentiment_snapshot_missing" },
      };
    },
  };

  const dataSourceDeps =
    params.deps?.createDataSource?.(sentimentPort) ??
    (() => {
      const container = getContainer();
      return {
        assets: { getActiveAssets },
        events: container.eventRepo,
        candles: container.candleRepo,
        sentiment: sentimentPort,
        biasProvider: new DbBiasProvider(),
        timeframeConfig: {
          getProfileTimeframes,
          getTimeframesForAsset,
          TIMEFRAME_SYNC_WINDOWS,
        },
        resolveProviderSymbol: (asset, source) =>
          resolveProviderSymbolForSource(asset as never, source as MarketDataSource),
        allowSync: false,
      };
    })();

  const loadPlaybackSetups =
    params.deps?.loadPlaybackSetups ??
    (async (assetId: string, asOf: Date) => {
      const snap = await getLatestPerceptionSnapshotIdAtOrBefore({ assetId, asOf });
      if (!snap) return [];
      const items = await listPerceptionSnapshotItemsForAsset({ snapshotId: snap.id, assetId });
      return mapItemsToSetups(items);
    });

  const getCandleOpenPrice =
    params.deps?.getCandleOpenPrice ??
    ((assetId: string, timeframe: string, timestamp: Date) => getCandleOpenAt({ assetId, timeframe, timestamp }));

  const writeReport =
    params.deps?.writeReport ??
    (async (report: BacktestReport, target: string) => {
      await ensureDirExists(target);
      await writeFile(target, JSON.stringify(report, null, 2), "utf8");
    });

  const buildSnapshot =
    params.deps?.buildSnapshot ??
    ((args: { asOf: Date; dataSource: ReturnType<typeof createPerceptionDataSource>; assetFilter?: string[] }) =>
      buildPerceptionSnapshot({ asOf: args.asOf, dataSource: args.dataSource, assetFilter: args.assetFilter }));

  const dataSource = createPerceptionDataSource(dataSourceDeps, { assetFilter: [params.assetId] });

  const steps: BacktestStepResult[] = [];
  const candleMetas: CandleMeta[] = [];
  const closedTrades: ClosedTrade[] = [];
  let openPosition: OpenPosition | null = null;
  let lastAsOf: Date | null = null;
  let cursor = new Date(from);
  while (cursor <= to) {
    const asOf = new Date(cursor);
    if (params.debug ?? process.env.NODE_ENV !== "production") {
      if (lastAsOf && asOf.getTime() < lastAsOf.getTime()) {
        throw new Error(`backtest_invariant: asOf not monotonic (prev ${lastAsOf.toISOString()} > ${asOf.toISOString()})`);
      }
    }
    lastSentimentFound = false;
    lastSentimentIso = undefined;
    if (snapshotMode === "playback") {
      try {
        const setups = await loadPlaybackSetups(params.assetId, asOf);
        const candleMeta: CandleMeta = { asOfIso: asOf.toISOString() };
        const openPrice = await getCandleOpenPrice(params.assetId, `${params.stepHours}H`, asOf);
        if (openPrice != null && Number.isFinite(openPrice)) {
          candleMeta.openPrice = openPrice;
          candleMeta.maxTimestampMs = asOf.getTime();
        }
        if (params.debug ?? process.env.NODE_ENV !== "production") {
          if (typeof candleMeta.maxTimestampMs === "number" && candleMeta.maxTimestampMs > asOf.getTime()) {
            throw new Error(
              `backtest_invariant: candle timestamp ${new Date(candleMeta.maxTimestampMs).toISOString()} is after asOf ${asOf.toISOString()}`,
            );
          }
        }
        const topSetup = pickTopSetup(setups);
        const scoreRaw = topSetup ? scoreOf(topSetup) : null;
        const score = scoreRaw ?? (typeof topSetup?.scoreTotal === "number" ? topSetup.scoreTotal : null);
        const topGrade = topSetup ? toGrade(topSetup) ?? deriveGradeFromScore(score) : null;
        const topDecisionResult = toDecision(topSetup ?? {});
        const label = topDecisionResult.decision ?? topGrade ?? null;
        const setupsSummary: NonNullable<BacktestStepResult["setupsSummary"]> = setups.slice(0, 3).map((s) => {
          const sScore = scoreOf(s) ?? (typeof s.scoreTotal === "number" ? s.scoreTotal : null);
          return {
            id: s.id,
            grade: toGrade(s) ?? deriveGradeFromScore(sScore),
            gradeSource: toGrade(s) ? "engine" : deriveGradeFromScore(sScore) ? "derived" : "unknown",
            decision: toDecision(s).decision,
            decisionSource: toDecision(s).decisionSource,
            direction: s.direction ?? null,
            scoreTotal: sScore,
          };
        });

        steps.push({
          asOfIso: asOf.toISOString(),
          label,
          setups: setups.length || undefined,
          score,
          topSetup: topSetup
            ? {
                id: topSetup.id,
                grade: topGrade,
                gradeSource: topGrade && toGrade(topSetup) ? "engine" : topGrade ? "derived" : "unknown",
                decision: topDecisionResult.decision ?? "unknown",
                decisionSource: topDecisionResult.decisionSource,
                direction: topSetup.direction ?? null,
                scoreTotal: score,
                confidence: typeof topSetup.confidence === "number" ? topSetup.confidence : null,
              }
            : null,
          setupsSummary,
          sentimentSnapshotFound: false,
          sentimentSnapshotAsOfIso: undefined,
          openPosition,
        });
        candleMetas.push(candleMeta);
      } catch (error) {
        if (params.debug ?? process.env.NODE_ENV !== "production") {
          throw error;
        }
        steps.push({
          asOfIso: asOf.toISOString(),
          label: null,
          score: null,
          warnings: [`playback_failed: ${String(error)}`],
        });
        candleMetas.push({});
      }
    } else {
      try {
        const snapshot = await buildSnapshot({ asOf, dataSource, assetFilter: [params.assetId] });
        const candleMeta = extractCandleMeta(snapshot, asOf.toISOString());
        if (params.debug ?? process.env.NODE_ENV !== "production") {
          if (typeof candleMeta.maxTimestampMs === "number" && candleMeta.maxTimestampMs > asOf.getTime()) {
            throw new Error(
              `backtest_invariant: candle timestamp ${new Date(candleMeta.maxTimestampMs).toISOString()} is after asOf ${asOf.toISOString()}`,
            );
          }
        }
        const setups = Array.isArray((snapshot as { setups?: unknown[] }).setups)
          ? ((snapshot as { setups: SetupLike[] }).setups ?? [])
          : [];
        const topSetup = pickTopSetup(setups);
        const score = topSetup ? scoreOf(topSetup) : null;
        const topGrade = topSetup ? toGrade(topSetup) ?? deriveGradeFromScore(score) : null;
        const topDecisionResult = toDecision(topSetup ?? {});
        const label = topDecisionResult.decision ?? topGrade ?? (snapshot as { label?: string | null }).label ?? null;
        const setupsSummary: NonNullable<BacktestStepResult["setupsSummary"]> = setups.slice(0, 3).map((s) => ({
          id: s.id,
          grade: toGrade(s) ?? deriveGradeFromScore(scoreOf(s)),
          gradeSource: toGrade(s) ? "engine" : deriveGradeFromScore(scoreOf(s)) ? "derived" : "unknown",
          decision: toDecision(s).decision,
          decisionSource: toDecision(s).decisionSource,
          direction: s.direction ?? null,
          scoreTotal: scoreOf(s),
        }));

        steps.push({
          asOfIso: asOf.toISOString(),
          label,
          setups: setups.length || undefined,
          score: score ?? (snapshot as { score?: number }).score ?? null,
          topSetup: topSetup
            ? {
                id: topSetup.id,
                grade: topGrade,
                gradeSource: topGrade && toGrade(topSetup) ? "engine" : topGrade ? "derived" : "unknown",
                decision: topDecisionResult.decision ?? "unknown",
                decisionSource: topDecisionResult.decisionSource,
                direction: topSetup.direction ?? null,
                scoreTotal: score,
                confidence: typeof topSetup.confidence === "number" ? topSetup.confidence : null,
              }
            : null,
          setupsSummary,
          sentimentSnapshotFound: lastSentimentFound,
          sentimentSnapshotAsOfIso: lastSentimentIso,
          openPosition,
        });
        candleMetas.push(candleMeta);
        if (params.debug ?? process.env.NODE_ENV !== "production") {
          if (lastSentimentFound && lastSentimentIso) {
            if (new Date(lastSentimentIso).getTime() > asOf.getTime()) {
              throw new Error(
                `backtest_invariant: sentiment snapshot ${lastSentimentIso} is after asOf ${asOf.toISOString()}`,
              );
            }
          }
        }
      } catch (error) {
        if (params.debug ?? process.env.NODE_ENV !== "production") {
          throw error;
        }
        steps.push({
          asOfIso: asOf.toISOString(),
          label: null,
          score: null,
          warnings: [`build_failed: ${String(error)}`],
        });
        candleMetas.push({});
      }
    }
    lastAsOf = asOf;
    cursor = addHours(cursor, params.stepHours);
  }

  for (let i = 0; i < steps.length; i += 1) {
    const intent = buildOrderIntent(steps[i], i, params.assetId);
    if (!intent) continue;
    const executedEntry = executeEntryAtNextStepOpen(intent, candleMetas[i + 1]);
    steps[i] = { ...steps[i], executedEntry };
    if (executedEntry.status === "filled" && !openPosition) {
      const side = toPositionSide(intent.side);
      if (side) {
        openPosition = {
          assetId: intent.assetId,
          side,
          entryIso: executedEntry.fill.fillIso,
          entryPrice: executedEntry.fill.fillPrice,
          entryStepIndex: i + 1, // entry fill happens on next step
        };
      }
    }
    if (openPosition) {
      const barsHeld = i - openPosition.entryStepIndex + 1;
      const shouldExit = barsHeld >= 3;
      if (shouldExit) {
        const exitMeta = candleMetas[i] ?? candleMetas[i - 1];
        const exitPrice =
          exitMeta?.openPrice != null && Number.isFinite(exitMeta.openPrice) ? exitMeta.openPrice : openPosition.entryPrice;
        const exitIso = (exitMeta?.asOfIso ?? steps[i].asOfIso)!;
        closedTrades.push({
          assetId: openPosition.assetId,
          side: openPosition.side,
          entry: { iso: openPosition.entryIso, price: openPosition.entryPrice },
          exit: { iso: exitIso, price: exitPrice },
          barsHeld,
          reason: exitMeta?.openPrice != null ? "time-exit" : "end-of-range",
        });
        openPosition = null;
      }
    }
  }

  if (openPosition) {
    const lastMeta = candleMetas[candleMetas.length - 1];
    const exitPrice =
      lastMeta?.openPrice != null && Number.isFinite(lastMeta.openPrice) ? lastMeta.openPrice : openPosition.entryPrice;
    const exitIso = (lastMeta?.asOfIso ?? steps[steps.length - 1]?.asOfIso)!;
    const barsHeld = steps.length - openPosition.entryStepIndex;
    closedTrades.push({
      assetId: openPosition.assetId,
      side: openPosition.side,
      entry: { iso: openPosition.entryIso, price: openPosition.entryPrice },
      exit: { iso: exitIso, price: exitPrice },
      barsHeld,
      reason: "end-of-range",
    });
    openPosition = null;
  }

  const completedTrades: CompletedTrade[] = enrichTradesWithPnl(
    closedTrades,
    params.costsConfig ?? defaultCostsConfig,
  );
  const kpis = computeBacktestKpis(completedTrades);

  const report: BacktestReport = {
    assetId: params.assetId,
    fromIso: params.fromIso,
    toIso: params.toIso,
    stepHours: params.stepHours,
    lookbackHours,
    steps,
    trades: completedTrades,
    summary: computeBacktestSummary(steps),
    kpis,
  };

  const reportPath = buildReportPath(params.assetId, params.fromIso, params.toIso, params.stepHours);
  await writeReport(report, reportPath);
  const runKey = buildBacktestRunKey({
    assetId: params.assetId,
    fromIso: params.fromIso,
    toIso: params.toIso,
    stepHours: params.stepHours,
    costsConfig: params.costsConfig ?? defaultCostsConfig,
    exitPolicy: params.exitPolicy ?? DEFAULT_EXIT_POLICY,
  });
  await upsertBacktestRun({
    runKey,
    assetId: params.assetId,
    fromIso: params.fromIso,
    toIso: params.toIso,
    stepHours: params.stepHours,
    costsConfig: params.costsConfig ?? defaultCostsConfig,
    exitPolicy: params.exitPolicy ?? DEFAULT_EXIT_POLICY,
    kpis,
    reportPath,
    trades: completedTrades,
  });
  return { ok: true, reportPath, steps: steps.length };
}
