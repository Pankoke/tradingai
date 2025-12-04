import { fetcher } from "@/src/lib/fetcher";
import { setupSchema, type Setup, riskRewardSchema, type RiskRewardSummary } from "@/src/lib/engine/types";
import { z } from "zod";

const eventContextSchema = z
  .object({
    topEvents: z
      .array(
        z.object({
          id: z.string().optional(),
          title: z.string().optional(),
          category: z.string().optional(),
          severity: z.string().optional(),
          scheduledAt: z.string().optional(),
          source: z.string().optional(),
        }),
      )
      .optional()
      .nullable(),
  })
  .optional()
  .nullable();

const perceptionTodayItemSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  assetId: z.string(),
  setupId: z.string(),
  direction: z.enum(["long", "short", "neutral"]),
  rankOverall: z.number(),
  rankWithinAsset: z.number(),
  scoreTotal: z.number(),
  scoreTrend: z.number().nullable(),
  scoreMomentum: z.number().nullable(),
  scoreVolatility: z.number().nullable(),
  scorePattern: z.number().nullable(),
  confidence: z.number(),
  biasScoreAtTime: z.number().nullable(),
  eventContext: eventContextSchema,
  isSetupOfTheDay: z.boolean(),
  createdAt: z.string(),
  riskReward: riskRewardSchema.nullable(),
});

const snapshotMetadataSchema = z.object({
  id: z.string(),
  snapshotTime: z.string(),
  label: z.string().nullable(),
  version: z.string(),
  dataMode: z.string(),
  generatedMs: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const perceptionTodaySchema = z.object({
  snapshot: snapshotMetadataSchema,
  items: perceptionTodayItemSchema.array(),
  setups: setupSchema.array(),
});

export type PerceptionTodayResponse = z.infer<typeof perceptionTodaySchema>;

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

export async function fetchPerceptionToday(): Promise<PerceptionTodayResponse> {
  try {
    return await fetcher(resolveUrl("/api/perception/today"), perceptionTodaySchema);
  } catch (error) {
    if (typeof window === "undefined") {
      const { buildAndStorePerceptionSnapshot } = await import(
        "@/src/features/perception/build/buildSetups"
      );
      const persisted = await buildAndStorePerceptionSnapshot();
      return {
        snapshot: {
          ...persisted.snapshot,
          snapshotTime: persisted.snapshot.snapshotTime.toISOString(),
          createdAt: persisted.snapshot.createdAt
            ? persisted.snapshot.createdAt.toISOString()
            : new Date().toISOString(),
        },
        items: persisted.items.map((item) => ({
          ...item,
          direction: item.direction.toLowerCase() as "long" | "short" | "neutral",
          createdAt: item.createdAt
            ? item.createdAt.toISOString()
            : new Date().toISOString(),
          riskReward: (item.riskReward ?? null) as RiskRewardSummary | null,
          eventContext: (item as { eventContext?: unknown }).eventContext ?? null,
        })),
        setups: persisted.setups,
      };
    }
    throw error;
  }
}

export async function fetchTodaySetups(): Promise<{ setups: Setup[]; setupOfTheDayId: string }> {
  const schema = z.object({
    setups: setupSchema.array(),
    setupOfTheDayId: z.string(),
  });
  const data = await fetcher(resolveUrl("/api/setups/today"), schema);
  return data;
}
