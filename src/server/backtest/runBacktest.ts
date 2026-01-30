import { promises as fs } from "fs";
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
  warnings?: string[];
};

export type BacktestReport = {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  lookbackHours: number;
  steps: BacktestStepResult[];
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

function buildReportPath(assetId: string, fromIso: string, toIso: string, stepHours: number) {
  const safeAsset = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFrom = fromIso.replace(/[^0-9T:-]/g, "_");
  const safeTo = toIso.replace(/[^0-9T:-]/g, "_");
  return path.join(process.cwd(), "reports", "backtests", safeAsset, `${safeFrom}-${safeTo}-step${stepHours}h.json`);
}

export async function runBacktest(params: {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  lookbackHours?: number;
  timeframeFilter?: CandleTimeframe[];
  deps?: RunBacktestDeps;
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

  const sentimentPort: SentimentProviderPort = {
    fetchSentiment: async ({ assetId, asOf }) => {
      const snap = await loadSentimentSnapshot(assetId, asOf);
      if (snap) return snap;
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
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, JSON.stringify(report, null, 2), "utf8");
    });

  const buildSnapshot =
    params.deps?.buildSnapshot ??
    ((args: { asOf: Date; dataSource: ReturnType<typeof createPerceptionDataSource>; assetFilter?: string[] }) =>
      buildPerceptionSnapshot({ asOf: args.asOf, dataSource: args.dataSource, assetFilter: args.assetFilter }));

  const dataSource = createPerceptionDataSource(dataSourceDeps, { assetFilter: [params.assetId] });

  const steps: BacktestStepResult[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const asOf = new Date(cursor);
    try {
      const snapshot = await buildSnapshot({ asOf, dataSource, assetFilter: [params.assetId] });
      steps.push({
        asOfIso: asOf.toISOString(),
        label: (snapshot as { label?: string | null }).label ?? null,
        setups: Array.isArray((snapshot as { setups?: unknown[] }).setups) ? (snapshot as { setups?: unknown[] }).setups?.length : undefined,
        score: (snapshot as { score?: number }).score ?? null,
      });
    } catch (error) {
      steps.push({
        asOfIso: asOf.toISOString(),
        label: null,
        score: null,
        warnings: [`build_failed: ${String(error)}`],
      });
    }
    cursor = addHours(cursor, params.stepHours);
  }

  const report: BacktestReport = {
    assetId: params.assetId,
    fromIso: params.fromIso,
    toIso: params.toIso,
    stepHours: params.stepHours,
    lookbackHours,
    steps,
  };

  const reportPath = buildReportPath(params.assetId, params.fromIso, params.toIso, params.stepHours);
  await writeReport(report, reportPath);
  return { ok: true, reportPath, steps: steps.length };
}
