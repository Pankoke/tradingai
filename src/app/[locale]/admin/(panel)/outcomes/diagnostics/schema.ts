import { z } from "zod";
import { OutcomeReportSchema } from "../../playbooks/schema";

export const JoinStatsBreakdownSchema = z.object({
  assetId: z.string().optional().default("unknown"),
  timeframe: z.string().optional().default("unknown"),
  label: z.string().optional().default("unknown"),
  setups: z.number().optional().default(0),
  outcomes: z.number().optional().default(0),
  matched: z.number().optional().default(0),
  unmatched: z.number().optional().default(0),
  joinRate: z.number().optional().nullable(),
});

export const JoinStatsSchema = z.object({
  version: z.string().optional().default("v1"),
  generatedAt: z.string(),
  params: z
    .object({
      days: z.number().optional(),
    })
    .optional()
    .default({}),
  overall: z.object({
    setups: z.number().optional().default(0),
    outcomes: z.number().optional().default(0),
    matched: z.number().optional().default(0),
    unmatched: z.number().optional().default(0),
    joinRate: z.number().optional().nullable(),
  }),
  breakdowns: z.array(JoinStatsBreakdownSchema).optional().default([]),
});

export const OutcomeReport = OutcomeReportSchema;
export type OutcomeReport = z.infer<typeof OutcomeReportSchema>;
export type JoinStats = z.infer<typeof JoinStatsSchema>;
