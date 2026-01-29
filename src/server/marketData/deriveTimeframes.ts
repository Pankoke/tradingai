import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleTimeframe, CandleInsert, CandleRow } from "@/src/domain/market-data/types";
import { aggregateCandles } from "@/src/domain/market-data/services/aggregateCandles";
import type { DerivedPair } from "@/src/server/marketData/derived-config";

const TIMEFRAME_MS: Record<CandleTimeframe, number> = {
  "15m": 15 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
};

type DeriveErrorCode = "DERIVE_FAILED" | "FETCH_FAILED" | "UPSERT_FAILED" | "UNSUPPORTED_TIMEFRAME";

export type DeriveTimeframesOk = {
  ok: true;
  derivedComputed: number;
  upserted: number;
  updated: number;
  missingInputs: number;
  warnings: string[];
  durationMs: number;
  params: {
    assetId: string;
    sourceTimeframe: CandleTimeframe;
    targetTimeframe: CandleTimeframe;
    lookbackCount: number;
    asOf: Date;
  };
};

export type DeriveTimeframesErr = {
  ok: false;
  error: { code: DeriveErrorCode; message: string };
  durationMs: number;
  derivedComputed?: number;
  upserted?: number;
  updated?: number;
  missingInputs?: number;
  warnings?: string[];
  params: {
    assetId: string;
    sourceTimeframe: CandleTimeframe;
    targetTimeframe: CandleTimeframe;
    lookbackCount: number;
    asOf: Date;
  };
};

export type DeriveTimeframesResult = DeriveTimeframesOk | DeriveTimeframesErr;

type DeriveParams = {
  assetId: string;
  sourceTimeframe: CandleTimeframe;
  targetTimeframe: CandleTimeframe;
  lookbackCount: number;
  asOf: Date;
  candleRepo: CandleRepositoryPort;
  sourceLabel?: string;
  derivedPair?: DerivedPair;
};

export async function deriveCandlesForTimeframe(params: DeriveParams): Promise<DeriveTimeframesResult> {
  const pair = params.derivedPair;
  const sourceTimeframe = pair?.source ?? params.sourceTimeframe;
  const targetTimeframe = pair?.target ?? params.targetTimeframe;
  const lookbackCount = pair?.lookbackCount ?? params.lookbackCount;
  const { assetId, asOf, candleRepo } = params;
  const startedAt = Date.now();
  const baseParams = { assetId, sourceTimeframe, targetTimeframe, lookbackCount, asOf };
  const sourceMs = TIMEFRAME_MS[sourceTimeframe];

  if (!sourceMs) {
    return {
      ok: false,
      error: { code: "UNSUPPORTED_TIMEFRAME", message: `Unsupported source timeframe ${sourceTimeframe}` },
      durationMs: Date.now() - startedAt,
      params: baseParams,
    };
  }

  try {
    const from = new Date(asOf.getTime() - lookbackCount * sourceMs);
    const sourceCandles: CandleRow[] = await candleRepo.findRangeByAsset(assetId, sourceTimeframe, from, asOf);

    const aggregated = aggregateCandles({
      candles: sourceCandles,
      sourceTimeframe,
      targetTimeframe,
      asOf,
    }).map((candle) => ({
      ...candle,
      source: params.sourceLabel ?? "derived",
    })) as CandleInsert[];

    const missingInputs = Math.max(0, lookbackCount - sourceCandles.length);
    const warnings: string[] = [];
    if (missingInputs > 0) {
      warnings.push(`missingInputs~${missingInputs} (source candles below requested lookback)`);
    }
    if (!aggregated.length) {
      warnings.push("no_aggregated_candles");
      return {
        ok: true,
        derivedComputed: 0,
        upserted: 0,
        updated: 0,
        missingInputs,
        warnings,
        durationMs: Date.now() - startedAt,
        params: baseParams,
      };
    }

    try {
      const result = await candleRepo.upsertMany(aggregated);
      const upserted = result.upserted ?? result.inserted ?? 0;
      const updated = result.updated ?? 0;
      return {
        ok: true,
        derivedComputed: aggregated.length,
        upserted,
        updated,
        missingInputs,
        warnings,
        durationMs: Date.now() - startedAt,
        params: baseParams,
      };
    } catch (error) {
      return {
        ok: false,
        error: { code: "UPSERT_FAILED", message: getMessage(error) },
        durationMs: Date.now() - startedAt,
        derivedComputed: aggregated.length,
        missingInputs,
        warnings,
        params: baseParams,
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: { code: "FETCH_FAILED", message: getMessage(error) },
      durationMs: Date.now() - startedAt,
      params: baseParams,
    };
  }
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
