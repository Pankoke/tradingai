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
import { getLatestSentimentSnapshotAtOrBefore, getSentimentSnapshotStats } from "@/src/server/repositories/sentimentSnapshotRepository";
import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";
import type { CandleTimeframe } from "@/src/domain/market-data/types";

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
};

export type BacktestReport = {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  lookbackHours: number;
  steps: BacktestStepResult[];
  summary: BacktestSummary;
};

export type RunBacktestDeps = {
  createDataSource?: (sentiment: SentimentProviderPort) => PerceptionDataSourceDeps;
  buildSnapshot?: (args: { asOf: Date; dataSource: ReturnType<typeof createPerceptionDataSource>; assetFilter?: string[] }) => Promise<PerceptionSnapshot>;
  loadSentimentSnapshot?: (assetId: string, asOf: Date) => Promise<SentimentSnapshotV2 | null>;
  writeReport?: (report: BacktestReport, targetPath: string) => Promise<void>;
};

const DEFAULT_LOOKBACK_HOURS = 24;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function sanitizeName(value: string) {
  // Remove characters illegal on Windows filesystems.
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

type SetupLike = {
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
  deps?: RunBacktestDeps;
  debug?: boolean;
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
    try {
      const snapshot = await buildSnapshot({ asOf, dataSource, assetFilter: [params.assetId] });
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
      });
      if (params.debug ?? process.env.NODE_ENV !== "production") {
        if (!lastSentimentFound) {
          const probe = await loadSentimentSnapshot(params.assetId, asOf);
          if (probe) {
            lastSentimentFound = true;
            lastSentimentIso = probe.asOfIso;
          }
        }
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
    }
    lastAsOf = asOf;
    cursor = addHours(cursor, params.stepHours);
  }

  const report: BacktestReport = {
    assetId: params.assetId,
    fromIso: params.fromIso,
    toIso: params.toIso,
    stepHours: params.stepHours,
    lookbackHours,
    steps,
    summary: computeBacktestSummary(steps),
  };

  const reportPath = buildReportPath(params.assetId, params.fromIso, params.toIso, params.stepHours);
  await writeReport(report, reportPath);
  return { ok: true, reportPath, steps: steps.length };
}
