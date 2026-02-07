import { z } from "zod";

export const directionEnum = z.enum(["Long", "Short"]);
export type Direction = z.infer<typeof directionEnum>;

export const setupTypeEnum = z.enum(["Regelbasiert", "KI"]);
export type SetupType = z.infer<typeof setupTypeEnum>;

export const setupGradeEnum = z.enum(["A", "B", "NO_TRADE"]);
export type SetupGrade = z.infer<typeof setupGradeEnum>;

export const setupPlaybookTypeEnum = z.enum(["pullback_continuation", "range_bias", "unknown"]);
export type SetupPlaybookType = z.infer<typeof setupPlaybookTypeEnum>;

export const accessLevelSchema = z.enum(["free", "premium", "pro"]);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

const ringPercentSchema = z.number().min(0).max(100);

export const ringQualityEnum = z.enum(["live", "derived", "fallback", "heuristic", "stale", "unknown"]);
export type RingQuality = z.infer<typeof ringQualityEnum>;

const ringTimeframeEnum = z.enum(["intraday", "daily", "swing", "unknown"]);
export type RingTimeframe = z.infer<typeof ringTimeframeEnum>;

export const ringMetaSchema = z.object({
  quality: ringQualityEnum,
  timeframe: ringTimeframeEnum.optional(),
  asOf: z.string().optional(),
  notes: z.array(z.string()).optional(),
});
export type RingMeta = z.infer<typeof ringMetaSchema>;

const ringMetaMapSchema = z.object({
  trend: ringMetaSchema,
  event: ringMetaSchema,
  bias: ringMetaSchema,
  sentiment: ringMetaSchema,
  orderflow: ringMetaSchema,
  confidence: ringMetaSchema,
});
export type SetupRingMeta = z.infer<typeof ringMetaMapSchema>;

export const sentimentLabelEnum = z.enum([
  "extreme_bullish",
  "bullish",
  "neutral",
  "bearish",
  "extreme_bearish",
]);
export type SentimentLabel = z.infer<typeof sentimentLabelEnum>;

const sentimentRankingHintEnum = z.enum(["positive", "negative", "neutral"]);
export type SentimentRankingHint = z.infer<typeof sentimentRankingHintEnum>;

const orderflowModeSchema = z.enum([
  "buyers",
  "sellers",
  "balanced",
  "buyers_dominant",
  "sellers_dominant",
  "trending",
  "choppy",
  "mean-reversion",
]);
export type OrderflowModeLabel = z.infer<typeof orderflowModeSchema>;

export const orderflowFlagEnum = z.enum([
  "orderflow_trend_alignment",
  "orderflow_trend_conflict",
  "orderflow_bias_alignment",
  "orderflow_bias_conflict",
  "high_risk_crowded",
  "volume_surge",
  "volume_dry",
  "choppy",
  "expansion",
]);
export type OrderflowFlag = z.infer<typeof orderflowFlagEnum>;

export const orderflowReasonCategoryEnum = z.enum([
  "volume",
  "price_action",
  "structure",
  "trend_alignment",
  "trend_conflict",
]);
export type OrderflowReasonCategory = z.infer<typeof orderflowReasonCategoryEnum>;

const orderflowReasonDetailSchema = z.object({
  category: orderflowReasonCategoryEnum,
  text: z.string(),
});

const orderflowMetaSchema = z
  .object({
    clv: z.number().optional(),
    relVolume: z.number().optional(),
    expansion: z.number().optional(),
    consistency: z.number().optional(),
    profile: z.string().optional(),
    timeframeSamples: z.record(z.string(), z.number()).optional(),
    context: z
      .object({
        trendScore: z.number().nullable().optional(),
        biasScore: z.number().nullable().optional(),
      })
      .optional(),
  })
  .optional();

const orderflowDetailSchema = z.object({
  score: ringPercentSchema,
  mode: orderflowModeSchema.optional().nullable(),
  reasons: z.array(z.string()),
  reasonDetails: z.array(orderflowReasonDetailSchema).optional(),
  flags: z.array(orderflowFlagEnum).optional(),
  meta: orderflowMetaSchema,
  confidenceDelta: z.number().optional(),
  clv: z.number().optional(),
  relVolume: z.number().optional(),
  expansion: z.number().optional(),
  consistency: z.number().optional(),
});

export type OrderflowDetail = z.infer<typeof orderflowDetailSchema>;

export const sentimentFlagEnum = z.enum([
  "supports_trend",
  "supports_bias",
  "contrarian_to_trend",
  "contrarian_to_bias",
  "event_capped",
  "rrr_mismatch",
  "high_risk_crowded",
  "low_conviction",
]);
export type SentimentFlag = z.infer<typeof sentimentFlagEnum>;

export const sentimentDriverCategoryEnum = z.enum([
  "bias",
  "trend",
  "momentum",
  "event",
  "orderflow",
  "rrr",
  "risk",
  "volatility",
  "drift",
]);
export type SentimentDriverCategory = z.infer<typeof sentimentDriverCategoryEnum>;

export const sentimentDriverSummarySchema = z.object({
  category: sentimentDriverCategoryEnum,
  contribution: z.number(),
});
export type SentimentDriverSummary = z.infer<typeof sentimentDriverSummarySchema>;

const setupRingsSchema = z.object({
  trendScore: ringPercentSchema,
  eventScore: ringPercentSchema,
  biasScore: ringPercentSchema,
  sentimentScore: ringPercentSchema,
  orderflowScore: ringPercentSchema,
  confidenceScore: ringPercentSchema,
  event: ringPercentSchema,
  bias: ringPercentSchema,
  sentiment: ringPercentSchema,
  orderflow: ringPercentSchema,
  confidence: ringPercentSchema,
  meta: ringMetaMapSchema,
});

const sentimentDetailSchema = z.object({
  score: ringPercentSchema,
  label: sentimentLabelEnum,
  reasons: z.array(z.string()),
  raw: z
    .object({
      source: z.string().optional(),
      timestamp: z.string().optional(),
      profileKey: z.string().optional(),
      biasScore: z.number().nullable().optional(),
      trendScore: z.number().nullable().optional(),
      momentumScore: z.number().nullable().optional(),
      orderflowScore: z.number().nullable().optional(),
      eventScore: z.number().nullable().optional(),
      rrr: z.number().nullable().optional(),
      riskPercent: z.number().nullable().optional(),
      volatilityLabel: z.string().nullable().optional(),
      driftPct: z.number().nullable().optional(),
      baseScore: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  contributions: z
    .array(
      z.object({
        id: z.enum([
          "bias",
          "trend",
          "momentum",
          "orderflow",
          "event",
          "rrr",
          "riskPercent",
          "volatility",
          "drift",
        ]),
        delta: z.number(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  flags: z.array(sentimentFlagEnum).optional(),
  dominantDrivers: z.array(sentimentDriverSummarySchema).optional(),
  confidenceDelta: z.number().optional(),
  rankingDelta: z.number().optional(),
  rankingHint: sentimentRankingHintEnum.optional(),
});

const levelDebugSchema = z.object({
  bandPct: z.number().nullable(),
  referencePrice: z.number().nullable(),
  category: z.string(),
  volatilityScore: z.number().nullable(),
  scoreVolatility: z.number().nullable(),
  refinementUsed: z.boolean().optional(),
  refinementApplied: z.boolean().optional(),
  refinementSource: z.string().nullable().optional(),
  refinementReason: z.string().nullable().optional(),
  levelsRefinementApplied: z.boolean().optional(),
  levelsRefinementTimeframe: z.string().nullable().optional(),
  levelsRefinementReason: z.string().nullable().optional(),
  refinementEffect: z
    .object({
      bandPctMultiplier: z.number().nullable().optional(),
      avgRangePct: z.number().nullable().optional(),
      sampleSize: z.number().nullable().optional(),
      entryDeltaPct: z.number().nullable().optional(),
      stopDeltaPct: z.number().nullable().optional(),
      tpDeltaPct: z.number().nullable().optional(),
      boundsMode: z.enum(["ATR1D", "PCT"]).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const volatilityLabelEnum = z.enum(["low", "medium", "high"]);
export type VolatilityLabel = z.infer<typeof volatilityLabelEnum>;

export const riskRewardSchema = z.object({
  riskPercent: z.number().nullable(),
  rewardPercent: z.number().nullable(),
  rrr: z.number().nullable(),
  volatilityLabel: volatilityLabelEnum.nullable(),
});
export type RiskRewardSummary = z.infer<typeof riskRewardSchema>;

const setupValiditySchema = z.object({
  isStale: z.boolean(),
  reasons: z.array(z.string()).optional(),
  lastPrice: z.number().nullable().optional(),
  priceDriftPct: z.number().nullable().optional(),
  evaluatedAt: z.string().optional(),
});

export const ringAiSummarySchema = z.object({
  shortSummary: z.string(),
  longSummary: z.string(),
  keyFacts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  source: z.enum(["heuristic", "llm"]).optional(),
});
export type RingAiSummary = z.infer<typeof ringAiSummarySchema>;

const eventContextItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
  scheduledAt: z.string().optional(),
  source: z.string().optional(),
  impact: z.number().optional(),
  timeToEventMinutes: z.number().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  summary: z.string().optional(),
  marketScope: z.string().optional(),
  actualValue: z.string().optional(),
  forecastValue: z.string().optional(),
  previousValue: z.string().optional(),
});

const eventContextSchema = z.object({
  windowFrom: z.string().optional(),
  windowTo: z.string().optional(),
  windowKind: ringTimeframeEnum.optional(),
  eventCount: z.number().optional(),
  notes: z.array(z.string()).optional(),
  topEvents: z.array(eventContextItemSchema).optional().nullable(),
});

const eventModifierClassificationEnum = z.enum([
  "none",
  "awareness_only",
  "context_relevant",
  "execution_critical",
]);
export type EventModifierClassification = z.infer<typeof eventModifierClassificationEnum>;

const eventModifierPrimarySchema = z.object({
  title: z.string().optional(),
  scheduledAt: z.string().optional(),
  impact: z.number().optional(),
  minutesToEvent: z.number().optional(),
  source: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  category: z.string().optional(),
});

const eventModifierSchema = z.object({
  classification: eventModifierClassificationEnum,
  primaryEvent: eventModifierPrimarySchema.optional(),
  rationale: z.array(z.string()).max(3).optional(),
  executionAdjustments: z.array(z.string()).max(4).optional(),
  reliabilityWeight: z.number().min(0).max(1).optional(),
  surprise: z
    .object({
      label: z.enum(["above", "below", "inline"]),
      magnitude: z.number().optional(),
    })
    .optional(),
  quality: z
    .object({
      usedGlobalFallback: z.boolean().optional(),
      missingFields: z.array(z.string()).optional(),
      reliabilityBucket: z.enum(["low", "med", "high"]).optional(),
    })
    .optional(),
});
export type EventModifier = z.infer<typeof eventModifierSchema>;

export const setupSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  timeframeUsed: z.string().optional(),
  profile: z.string().optional(),
  setupPlaybookId: z.string().optional().nullable(),
  dataSourcePrimary: z.string().optional().nullable(),
  dataSourceUsed: z.string().optional().nullable(),
  providerSymbolUsed: z.string().optional().nullable(),
  direction: directionEnum,
  confidence: z.number().min(0).max(100),
  snapshotId: z.string().nullable().optional(),
  snapshotCreatedAt: z.string().nullable().optional(),
  eventScore: z.number().min(0).max(100),
  biasScore: z.number().min(0).max(100),
  sentimentScore: z.number().min(0).max(100),
  balanceScore: z.number().min(0).max(100),
  entryZone: z.string().nullable(),
  stopLoss: z.string().nullable(),
  takeProfit: z.string().nullable(),
  category: z.string().optional(),
  levelDebug: levelDebugSchema.optional(),
  orderflowMode: orderflowModeSchema.optional().nullable(),
  type: setupTypeEnum,
  accessLevel: accessLevelSchema,
  rings: setupRingsSchema,
  riskReward: riskRewardSchema,
  orderflowConfidenceDelta: z.number().optional(),
  ringAiSummary: ringAiSummarySchema.nullable().optional(),
  validity: setupValiditySchema.optional(),
  sentiment: sentimentDetailSchema.optional(),
  orderflow: orderflowDetailSchema.optional(),
  eventContext: eventContextSchema.optional().nullable(),
  eventModifier: eventModifierSchema.optional().nullable(),
  setupGrade: setupGradeEnum.optional(),
  setupType: setupPlaybookTypeEnum.optional(),
  gradeRationale: z.array(z.string()).max(3).optional(),
  noTradeReason: z.string().optional().nullable(),
  gradeDebugReason: z.string().optional(),
  playbookId: z.string().optional().nullable(),
  grade: setupGradeEnum.optional().nullable(),
  decision: z.string().optional().nullable(),
  decisionVersion: z.string().optional().nullable(),
  decisionSegment: z.string().optional().nullable(),
  alignment: z.string().optional().nullable(),
  decisionReasons: z.array(z.string()).optional().nullable(),
  watchSegment: z.string().optional().nullable(),
});

export type Setup = z.infer<typeof setupSchema>;

export const perceptionSnapshotSchema = z.object({
  generatedAt: z.string(),
  universe: z.array(z.string()),
  setups: z.array(setupSchema),
  setupOfTheDayId: z.string(),
  version: z.string(),
});

export type PerceptionSnapshot = z.infer<typeof perceptionSnapshotSchema>;

export type SetupSentiment = z.infer<typeof sentimentDetailSchema>;
