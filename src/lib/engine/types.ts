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

export const setupSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  direction: directionEnum,
  confidence: z.number().min(0).max(100),
  eventScore: z.number().min(0).max(100),
  biasScore: z.number().min(0).max(100),
  sentimentScore: z.number().min(0).max(100),
  balanceScore: z.number().min(0).max(100),
  entryZone: z.string(),
  stopLoss: z.string(),
  takeProfit: z.string(),
  type: setupTypeEnum,
  accessLevel: accessLevelSchema,
  rings: setupRingsSchema,
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
