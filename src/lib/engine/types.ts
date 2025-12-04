import { z } from "zod";

export const directionEnum = z.enum(["Long", "Short"]);
export type Direction = z.infer<typeof directionEnum>;

export const setupTypeEnum = z.enum(["Regelbasiert", "KI"]);
export type SetupType = z.infer<typeof setupTypeEnum>;

export const accessLevelSchema = z.enum(["free", "premium", "pro"]);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

const ringPercentSchema = z.number().min(0).max(100);

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
});

const levelDebugSchema = z.object({
  bandPct: z.number().nullable(),
  referencePrice: z.number().nullable(),
  category: z.string(),
  volatilityScore: z.number().nullable(),
  scoreVolatility: z.number().nullable(),
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

export const setupSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
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
  type: setupTypeEnum,
  accessLevel: accessLevelSchema,
  rings: setupRingsSchema,
  riskReward: riskRewardSchema,
  eventContext: z
    .object({
      topEvents: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          category: z.string(),
          severity: z.string(),
          scheduledAt: z.string(),
          source: z.string().optional(),
        }),
      ),
    })
    .optional(),
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
