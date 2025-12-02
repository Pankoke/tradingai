import { z } from "zod";

export const setupGeneratorRequestSchema = z.object({
  asset: z.string(),
  timeframe: z.enum(["15m", "1h", "4h", "1d"]),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
  directionMode: z.enum(["auto", "long", "short"]),
});

export const generatedSetupSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  direction: z.enum(["Long", "Short"]),
  entryZone: z.string(),
  stopLoss: z.string(),
  takeProfit: z.string(),
  confidence: z.number().min(0).max(100),
  eventScore: z.number().min(0).max(100),
  biasScore: z.number().min(0).max(100),
  sentimentScore: z.number().min(0).max(100),
  balanceScore: z.number().min(0).max(100),
  explanation: z.string(),
});

export const setupGeneratorResponseSchema = z.object({
  setup: generatedSetupSchema,
});

export type SetupGeneratorRequest = z.infer<typeof setupGeneratorRequestSchema>;
export type GeneratedSetup = z.infer<typeof generatedSetupSchema>;

export async function fetchSetupGenerator(input: SetupGeneratorRequest): Promise<GeneratedSetup> {
  const response = await fetch("/api/setup-generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(setupGeneratorRequestSchema.parse(input)),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch setup");
  }
  const json = await response.json();
  return setupGeneratorResponseSchema.parse(json).setup;
}

export function useSetupGenerator() {
  const [data, setData] = React.useState<GeneratedSetup | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generate = React.useCallback(
    async (payload: SetupGeneratorRequest) => {
      setLoading(true);
      setError(null);
      try {
        const setup = await fetchSetupGenerator(payload);
        setData(setup);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { data, loading, error, generate };
}

import React from "react";
