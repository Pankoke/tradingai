import { applyEventScoring } from "@/src/lib/engine/modules/eventScoring";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import { applySentimentScoring } from "@/src/lib/engine/modules/sentimentScoring";
import { sortSetupsForToday } from "@/src/lib/engine/modules/ranking";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import { computeSetupBalanceScore, computeSetupConfidence, computeSetupScore } from "@/src/lib/engine/scoring";
import { perceptionSnapshotSchema, type AccessLevel, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";
import { computeRingsForSetup, createDefaultRings } from "@/src/lib/engine/rings";
import { buildRingAiSummaryForSetup } from "@/src/lib/engine/modules/ringAiSummary";
import type { RingMeta, SetupRingMeta } from "@/src/lib/engine/types";
import { getPerceptionDataMode } from "@/src/lib/config/perceptionDataMode";

const ENGINE_VERSION = "0.1.0";
const dataSource = createPerceptionDataSource();

const defaultRings = createDefaultRings();

const QUALITY_NOTES = {
  noEvents: "no_events",
  mockMode: "mock_mode",
  noBias: "no_bias_snapshot",
  hashFallback: "hash_fallback",
  noIntraday: "no_intraday_candles",
  staleSignal: "stale_signal",
  noMarketData: "no_market_data",
  aggregate: "meta_aggregate",
} as const;

function clampRingScore(value?: number | null, fallback = 50): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mergeMetaNotes(existing?: string[], additions?: string[]): string[] | undefined {
  if (!existing && !additions) return undefined;
  const values = [...(existing ?? []), ...(additions ?? [])].filter(Boolean);
  return Array.from(new Set(values));
}

function buildTrendMeta(setup: Setup): RingMeta {
  const notes: string[] = [];
  const validity = setup.validity;
  const reasonText = validity?.reasons ?? [];
  if (reasonText.some((reason) => reason.toLowerCase().includes("no market data"))) {
    notes.push(QUALITY_NOTES.noMarketData);
  }
  if (validity?.isStale) {
    notes.push(QUALITY_NOTES.staleSignal);
  }
  return {
    quality: notes.includes(QUALITY_NOTES.noMarketData)
      ? "fallback"
      : validity?.isStale
        ? "stale"
        : "live",
    timeframe: "daily",
    asOf: validity?.evaluatedAt,
    notes: notes.length ? notes : undefined,
  };
}

function buildEventMeta(eventContext: Setup["eventContext"] | undefined, dataMode: "live" | "mock"): RingMeta {
  const hasEvents = Boolean(eventContext?.topEvents?.length);
  const notes: string[] = [];
  if (!hasEvents) {
    notes.push(QUALITY_NOTES.noEvents);
  }
  if (dataMode === "mock") {
    notes.push(QUALITY_NOTES.mockMode);
  }
  return {
    quality: hasEvents ? "live" : "fallback",
    timeframe: "intraday",
    notes: notes.length ? notes : undefined,
  };
}

function buildBiasMeta(meta?: { quality: RingMeta["quality"]; asOf?: string; timeframe?: RingMeta["timeframe"]; notes?: string[] }): RingMeta {
  if (!meta) {
    return {
      quality: "fallback",
      timeframe: "unknown",
      notes: [QUALITY_NOTES.noBias],
    };
  }
  return {
    quality: meta.quality,
    timeframe: meta.timeframe ?? "unknown",
    asOf: meta.asOf,
    notes: meta.notes,
  };
}

function buildSentimentMeta(base: Setup, sentimentProvided: boolean): RingMeta {
  if (!sentimentProvided) {
    return {
      quality: "heuristic",
      timeframe: "unknown",
      notes: [QUALITY_NOTES.hashFallback],
    };
  }
  return {
    quality: "live",
    timeframe: "daily",
    asOf: base.sentiment?.raw?.timestamp ?? base.snapshotCreatedAt ?? undefined,
    notes: base.sentiment?.raw?.source ? [base.sentiment.raw.source] : undefined,
  };
}

function buildOrderflowMeta(base: Setup): RingMeta {
  if (!base.orderflow) {
    return {
      quality: "fallback",
      timeframe: "intraday",
      notes: [QUALITY_NOTES.noIntraday],
    };
  }
  const hasNoData = base.orderflow.reasons?.some((reason) =>
    reason.toLowerCase().includes("insufficient intraday data"),
  );
  const notes = hasNoData ? [QUALITY_NOTES.noIntraday] : undefined;
  return {
    quality: hasNoData ? "fallback" : "derived",
    timeframe: "intraday",
    notes,
  };
}

function buildConfidenceMeta(meta: SetupRingMeta): RingMeta {
  const note = QUALITY_NOTES.aggregate;
  const mergedNotes = mergeMetaNotes([note], mergeMetaNotes(meta.event.notes, meta.bias.notes));
  return {
    quality: "derived",
    timeframe: "unknown",
    notes: mergedNotes,
  };
}

function createRingMetaOverrides(params: {
  setup: Setup;
  eventContext?: Setup["eventContext"];
  biasMeta?: { quality: RingMeta["quality"]; asOf?: string; timeframe?: RingMeta["timeframe"]; notes?: string[] };
  sentimentProvided: boolean;
  dataMode: "live" | "mock";
}): SetupRingMeta {
  const overrides: SetupRingMeta = {
    trend: buildTrendMeta(params.setup),
    event: buildEventMeta(params.eventContext, params.dataMode),
    bias: buildBiasMeta(params.biasMeta),
    sentiment: buildSentimentMeta(params.setup, params.sentimentProvided),
    orderflow: buildOrderflowMeta(params.setup),
    confidence: {
      quality: "derived",
      timeframe: "unknown",
      notes: [QUALITY_NOTES.aggregate],
    },
  };
  overrides.confidence = buildConfidenceMeta(overrides);
  return overrides;
}

export async function buildPerceptionSnapshot(options?: { asOf?: Date }): Promise<PerceptionSnapshot> {
  const asOf = options?.asOf ?? new Date();
  const setups = await dataSource.getSetupsForToday({ asOf });

  const windowFrom = new Date(asOf);
  windowFrom.setHours(windowFrom.getHours() - 12);
  const windowTo = new Date(asOf);
  windowTo.setHours(windowTo.getHours() + 12);

  const events = await dataSource.getEventsForWindow({
    from: windowFrom,
    to: windowTo,
  });

  const biasSnapshot: BiasSnapshot = await dataSource.getBiasSnapshotForAssets({
    assets: setups.map((setup) => ({
      assetId: setup.assetId ?? setup.symbol,
      symbol: setup.symbol,
      timeframe: setup.timeframe,
    })),
    date: asOf,
  });

  const dataMode = getPerceptionDataMode();
  const enriched: Setup[] = setups.map((item) => {
    const base: Setup = {
      ...item,
      assetId: item.assetId ?? item.symbol,
      orderflowMode: item.orderflowMode ?? null,
      rings: item.rings ?? defaultRings,
      accessLevel: "free",
    };

    const eventResult = applyEventScoring(base, events);
    const biasResult = applyBiasScoring(base, biasSnapshot);
    const sentimentResult = applySentimentScoring(base);
    const sentimentScore = base.sentiment?.score ?? sentimentResult.sentimentScore;
    const hasSentimentProvider = Boolean(base.sentiment);
    const sentimentDetail =
      base.sentiment ?? {
        score: sentimentScore,
        label: sentimentScore >= 65 ? "bullish" : sentimentScore <= 35 ? "bearish" : "neutral",
        reasons: ["Heuristic sentiment scoring"],
      };
    const scoreBreakdown = computeSetupScore({
      trendStrength: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      momentum: sentimentScore,
      volatility: Math.abs(eventResult.eventScore - biasResult.biasScore),
      pattern: base.balanceScore,
    });
    const effectiveOrderflowScore = clampRingScore(
      typeof base.orderflow?.score === "number" ? base.orderflow.score : base.balanceScore ?? 50,
    );
    const ringMetaOverrides = createRingMetaOverrides({
      setup: base,
      eventContext: eventResult.context,
      biasMeta: biasResult.meta,
      sentimentProvided: hasSentimentProvider,
      dataMode,
    });
    const rings = computeRingsForSetup({
      breakdown: scoreBreakdown,
      biasScore: biasResult.biasScore,
      sentimentScore,
      balanceScore: base.balanceScore,
      orderflowScore: effectiveOrderflowScore,
      confidence: base.confidence,
      direction: (base.direction?.toLowerCase() as "long" | "short" | "neutral") ?? null,
      assetId: base.assetId,
      symbol: base.symbol,
      timeframe: base.timeframe,
      setupId: base.id,
      ringMeta: ringMetaOverrides,
      eventContext: eventResult.context,
      dataMode,
    });
    const confidence = computeSetupConfidence({
      setupId: base.id,
      score: scoreBreakdown,
      rings,
    });
    const balanceScore = computeSetupBalanceScore([
      eventResult.eventScore,
      biasResult.biasScore,
      sentimentScore,
    ]);

      const fallbackLevelDebug = base.levelDebug ?? {
        bandPct: null,
        referencePrice: null,
        category: base.category ?? "unknown",
        volatilityScore: null,
      };
    const levelDebug = {
      ...fallbackLevelDebug,
      category: fallbackLevelDebug.category ?? base.category ?? "unknown",
      scoreVolatility: scoreBreakdown.volatility ?? null,
    };

    const ringAiSummary = buildRingAiSummaryForSetup({
      setup: {
        ...base,
        rings,
        confidence,
        riskReward: base.riskReward,
      },
    });

    const sanitizedOrderflow = base.orderflow
      ? {
          ...base.orderflow,
          score: effectiveOrderflowScore,
        }
      : undefined;

    return {
        ...base,
        eventScore: eventResult.eventScore,
        biasScore: biasResult.biasScore,
        sentimentScore,
        confidence,
        balanceScore,
        rings,
        levelDebug,
        sentiment: sentimentDetail,
        eventContext: eventResult.context,
        ringAiSummary,
        orderflow: sanitizedOrderflow,
      };
    });

  const ranked = sortSetupsForToday(enriched);

  if (ranked.length === 0) {
    throw new Error("No setups available to pick setup of the day.");
  }

  const maxPremiumIndex = Math.min(ranked.length - 1, 9);
  const rankedSetups = ranked.map((setup, index) => {
    let accessLevel: AccessLevel;
    if (index <= 3) {
      accessLevel = "free";
    } else if (index <= maxPremiumIndex) {
      accessLevel = "premium";
    } else {
      accessLevel = "pro";
    }
    return { ...setup, accessLevel };
  });

  const setupOfTheDay = rankedSetups[0];

  const candidate: PerceptionSnapshot = {
    generatedAt: new Date().toISOString(),
    universe: ["crypto", "fx", "commodities"],
    setups: rankedSetups,
    setupOfTheDayId: setupOfTheDay.id,
    version: ENGINE_VERSION,
  };

  return perceptionSnapshotSchema.parse(candidate);
}
