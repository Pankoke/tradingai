import { z } from "zod";

export const OutcomeStatusCountsSchema = z.object({
  outcomesTotal: z.number(),
  closedCount: z.number(),
  openCount: z.number(),
  tpCount: z.number(),
  slCount: z.number(),
  expiredCount: z.number(),
  ambiguousCount: z.number(),
  invalidCount: z.number(),
  unknownCount: z.number().optional().default(0),
  winrateDefinition: z.string().optional(),
  closeRate: z.number().nullable().optional(),
});

export const ByKeySchema = z.object({
  key: z.object({
    assetId: z.string(),
    timeframe: z.string(),
    label: z.string(),
    playbookId: z.string().optional().default("unknown"),
    decision: z.string().optional().default("unknown"),
    grade: z.string().optional().default("UNKNOWN"),
  }),
  outcomesTotal: z.number(),
  closedCount: z.number(),
  openCount: z.number(),
  tpCount: z.number(),
  slCount: z.number(),
  expiredCount: z.number(),
  ambiguousCount: z.number(),
  invalidCount: z.number(),
  unknownCount: z.number().optional().default(0),
});

export const OutcomeReportSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  params: z.object({
    days: z.number(),
    timeframes: z.array(z.string()),
    labels: z.array(z.string()),
  }),
  overall: OutcomeStatusCountsSchema,
  byKey: z.array(ByKeySchema),
});

export type OutcomeReport = z.infer<typeof OutcomeReportSchema>;
