import { z } from "zod";

export const eventCategoryEnum = z.enum(["macro", "crypto", "onchain", "technical", "other"]);
export type EventCategory = z.infer<typeof eventCategoryEnum>;

export const eventSeverityEnum = z.enum(["low", "medium", "high"]);
export type EventSeverity = z.infer<typeof eventSeverityEnum>;

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: eventCategoryEnum,
  severity: eventSeverityEnum,
  startTime: z.string(),
  endTime: z.string().nullable(),
  symbols: z.array(z.string()),
  source: z.string(),
});

export type Event = z.infer<typeof eventSchema>;

export const biasDirectionEnum = z.enum(["Bullish", "Bearish", "Neutral"]);
export type BiasDirection = z.infer<typeof biasDirectionEnum>;

export const biasEntrySchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  direction: biasDirectionEnum,
  confidence: z.number().min(0).max(100),
  comment: z.string(),
});

export type BiasEntry = z.infer<typeof biasEntrySchema>;

export const biasSnapshotSchema = z.object({
  generatedAt: z.string(),
  universe: z.array(z.string()),
  entries: z.array(biasEntrySchema),
  version: z.string(),
});

export type BiasSnapshot = z.infer<typeof biasSnapshotSchema>;
