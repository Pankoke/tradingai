import { z } from "zod";

const zDistributionEntry = z.union([
  z.number(),
  z.object({
    count: z.number().optional(),
    pct: z.number().optional(),
  }),
]);

const zDistribution = z
  .object({
    total: z.number(),
  })
  .catchall(zDistributionEntry);

const zOutcomeBucket = z.object({
  hit_tp: z.number().optional(),
  hit_sl: z.number().optional(),
  open: z.number().optional(),
  expired: z.number().optional(),
  ambiguous: z.number().optional(),
  evaluatedCount: z.number().optional(),
  winRateTpVsSl: z.number().optional(),
});

const zPhase0Meta = z.object({
  assetId: z.string(),
  profile: z.string(),
  timeframe: z.string(),
  daysBack: z.number(),
});

const zDiagnostics = z
  .object({
    regimeDistribution: z.record(z.string(), z.number()).optional(),
    volatilityBuckets: z
      .array(
        z.object({
          bucket: z.string(),
          count: z.number(),
        }),
      )
      .optional(),
    notes: z.array(z.string()).optional(),
  })
  .partial();

const zBiasBucket = z.object({
  total: z.number(),
  byGrade: z.record(z.string(), z.number()),
  noTradeReasons: z.record(z.string(), z.number()),
});

const zWatchSegment = z.object({
  count: z.number(),
  pct: z.number(),
  avgBias: z.number().nullable().optional(),
  avgTrend: z.number().nullable().optional(),
  avgSignalQuality: z.number().nullable().optional(),
  avgConfidence: z.number().nullable().optional(),
});

const zBtcWatchSegment = z.object({
  count: z.number(),
  pct: z.number(),
  avgBias: z.number().nullable().optional(),
  avgTrend: z.number().nullable().optional(),
  avgOrderflow: z.number().nullable().optional(),
  avgConfidence: z.number().nullable().optional(),
});

const zWatchUpgradeCandidates = z.object({
  definition: z.record(z.string(), z.unknown()),
  totalWatchFailsTrend: z.number().optional(),
  candidatesCount: z.number().optional(),
  candidatesPctOfWatchFailsTrend: z.number().optional(),
  avgBias: z.number().nullable().optional(),
  avgTrend: z.number().nullable().optional(),
  avgSignalQuality: z.number().nullable().optional(),
  avgConfidence: z.number().nullable().optional(),
});

const zAssetPhase0Summary = z.object({
  meta: z.object({
    assetId: z.string(),
    timeframe: z.string(),
    sampleWindowDays: z.number(),
    labelsUsedCounts: z.record(z.string(), z.number()).optional(),
  }),
  decisionDistribution: z.record(z.string(), z.number()),
  gradeDistribution: z.record(z.string(), z.number()).optional(),
  watchSegmentsDistribution: z.record(z.string(), z.number()).optional(),
  alignmentDistribution: z.record(z.string(), z.number()).optional(),
  upgradeCandidates: z
    .object({
      total: z.number(),
      byReason: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
  regimeDistribution: z.record(z.string(), z.number()).optional(),
  diagnostics: zDiagnostics.optional(),
  blockedReasonsDistribution: z.record(z.string(), z.number()).optional(),
  noTradeReasonsDistribution: z.record(z.string(), z.number()).optional(),
  watchReasonsDistribution: z.record(z.string(), z.number()).optional(),
});

export const zPhase0PayloadData = z
  .object({
    meta: zPhase0Meta,
    decisionDistribution: zDistribution,
    gradeDistribution: zDistribution.optional(),
    outcomesByDecision: z.record(z.string(), zOutcomeBucket).optional(),
    watchToTradeProxy: z
      .object({
        count: z.number(),
        total: z.number(),
        pct: z.number(),
      })
      .nullable()
      .optional(),
    debugMeta: z
      .object({
        biasHistogram: z.record(z.string(), zBiasBucket).optional(),
        cohortTimeRange: z
          .object({
            snapshotTimeMin: z.string().nullable().optional(),
            snapshotTimeMax: z.string().nullable().optional(),
          })
          .optional(),
        watchSegments: z.record(z.string(), zWatchSegment).nullable().optional(),
        btcWatchSegments: z.record(z.string(), zBtcWatchSegment).nullable().optional(),
        btcRegimeDistribution: z
          .object({
            total: z.number().optional(),
            TREND: z.object({ count: z.number(), pct: z.number() }).optional(),
            RANGE: z.object({ count: z.number(), pct: z.number() }).optional(),
            MISSING: z.object({ count: z.number(), pct: z.number() }).optional(),
          })
          .nullable()
          .optional(),
        btcTrendOnlyGate: z
          .object({
            totalSetups: z.number().optional(),
            trendRegimeCount: z.number().optional(),
            nonTrendRegimeCount: z.number().optional(),
            tradesAllowed: z.number().optional(),
            tradesBlockedByRegime: z.number().optional(),
          })
          .nullable()
          .optional(),
        watchUpgradeCandidates: zWatchUpgradeCandidates.nullable().optional(),
        btcAlignmentBreakdown: z
          .object({
            total: z.number(),
            top: z.array(z.object({ reason: z.string(), count: z.number(), pct: z.number() })),
          })
          .nullable()
          .optional(),
        btcAlignmentCounters: z
          .object({
            alignmentResolvedCount: z.number().optional(),
            alignmentDerivedCount: z.number().optional(),
            alignmentStillMissingCount: z.number().optional(),
            total: z.number().optional(),
          })
          .nullable()
          .optional(),
        btcLevelPlausibility: z
          .object({
            count: z.number(),
            parseErrors: z.number(),
            avgStopPct: z.number().nullable(),
            p50StopPct: z.number().nullable(),
            p90StopPct: z.number().nullable(),
            avgTargetPct: z.number().nullable(),
            p50TargetPct: z.number().nullable(),
            p90TargetPct: z.number().nullable(),
            avgRRR: z.number().nullable(),
          })
          .nullable()
          .optional(),
      })
      .passthrough()
      .optional(),
    summaries: z.record(z.string(), zAssetPhase0Summary).optional(),
  })
  .passthrough();

export const zPhase0Payload = z.object({
  ok: z.boolean(),
  data: zPhase0PayloadData,
});

export type Phase0Payload = z.infer<typeof zPhase0Payload>;
export type Phase0PayloadData = z.infer<typeof zPhase0PayloadData>;
export type AssetPhase0Summary = z.infer<typeof zAssetPhase0Summary>;
