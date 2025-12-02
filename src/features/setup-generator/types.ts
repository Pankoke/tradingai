import { z } from "zod";

export type Direction = "long" | "short";
export type DirectionMode = "auto" | Direction;
export type RiskProfile = "conservative" | "moderate" | "aggressive";
export type Timeframe = "15m" | "1h" | "4h" | "1d";

export type FormState = {
  asset: string;
  timeframe: Timeframe;
  riskProfile: RiskProfile;
  directionMode: DirectionMode;
};

export type GeneratedSetup = {
  id: string;
  asset: string;
  timeframe: Timeframe;
  direction: Direction;
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  riskPct: number;
  potentialPct: number;
  volatilityLabel: "low" | "medium" | "high";
  confidence: number;
  biasScore: number;
  sentimentScore: number;
  eventScore: number;
  balanceScore: number;
  validUntil: Date;
  contextSummary: string;
};

export const formStateSchema = z.object({
  asset: z.string(),
  timeframe: z.enum(["15m", "1h", "4h", "1d"]),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
  directionMode: z.enum(["auto", "long", "short"]),
});

export const generatedSetupSchema = z.object({
  id: z.string(),
  asset: z.string(),
  timeframe: z.enum(["15m", "1h", "4h", "1d"]),
  direction: z.enum(["long", "short"]),
  entryMin: z.number(),
  entryMax: z.number(),
  stopLoss: z.number(),
  takeProfit1: z.number(),
  takeProfit2: z.number(),
  riskReward: z.number(),
  riskPct: z.number(),
  potentialPct: z.number(),
  volatilityLabel: z.enum(["low", "medium", "high"]),
  confidence: z.number(),
  biasScore: z.number(),
  sentimentScore: z.number(),
  eventScore: z.number(),
  balanceScore: z.number(),
  validUntil: z.string(),
  contextSummary: z.string(),
});

export const setupResponseSchema = z.object({
  setup: generatedSetupSchema,
});
