import { fetcher } from "@/src/lib/fetcher";
import { setupSchema, type Setup, riskRewardSchema, type RiskRewardSummary } from "@/src/lib/engine/types";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { z } from "zod";

const eventContextSchema = z
  .object({
    windowFrom: z.string().optional(),
    windowTo: z.string().optional(),
    windowKind: z.enum(["intraday", "daily", "swing", "unknown"]).optional(),
    eventCount: z.number().optional(),
    notes: z.array(z.string()).optional(),
    topEvents: z
      .array(
        z.object({
          id: z.string().optional(),
          title: z.string().optional(),
          category: z.string().optional(),
          severity: z.string().optional(),
          scheduledAt: z.string().optional(),
          source: z.string().optional(),
          impact: z.number().optional(),
          timeToEventMinutes: z.number().optional(),
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
  meta: z
    .object({
      requestedProfile: z.string().nullable().optional(),
      fulfilledLabel: z.string().nullable().optional(),
      fallback: z.boolean().optional(),
      requestedAvailable: z.boolean().optional(),
      snapshotAvailable: z.boolean().optional(),
      snapshotAgeMinutes: z.number().nullable().optional(),
      isStale: z.boolean().optional(),
    })
    .optional(),
});

export type PerceptionTodayResponse = z.infer<typeof perceptionTodaySchema>;

function resolveUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

export async function fetchPerceptionToday(params?: { profile?: string | null }): Promise<PerceptionTodayResponse> {
  const url = params?.profile ? `/api/perception/today?profile=${params.profile}` : "/api/perception/today";
  try {
    return await fetcher(resolveUrl(url), perceptionTodaySchema);
  } catch (error) {
    if (typeof window === "undefined") {
      const { loadLatestSnapshotForProfile } = await import("@/src/features/perception/cache/snapshotStore");
      const requestedProfile = params?.profile ?? null;
      const fromStore = await loadLatestSnapshotForProfile(requestedProfile);
      if (fromStore.snapshot) {
        return {
          ...mapSnapshotToResponse(fromStore.snapshot),
          meta: {
            requestedProfile,
            fulfilledLabel: fromStore.fulfilledLabel,
            fallback: fromStore.fallbackUsed,
            requestedAvailable: fromStore.requestedAvailable,
            snapshotAvailable: fromStore.requestedAvailable,
            snapshotAgeMinutes: fromStore.snapshot.snapshot.snapshotTime
              ? Math.round((Date.now() - new Date(fromStore.snapshot.snapshot.snapshotTime).getTime()) / 60000)
              : null,
            isStale: requestedProfile === "intraday"
              ? (fromStore.snapshot.snapshot.snapshotTime
                  ? Math.round((Date.now() - new Date(fromStore.snapshot.snapshot.snapshotTime).getTime()) / 60000) > 90
                  : true)
              : (fromStore.snapshot.snapshot.snapshotTime
                  ? Math.round((Date.now() - new Date(fromStore.snapshot.snapshot.snapshotTime).getTime()) / 60000) > 720
                  : true),
          },
        };
      }
      throw error;
    }
    throw error;
  }
}

function mapSnapshotToResponse(snapshot: PerceptionSnapshotWithItems) {
  return {
    snapshot: {
      ...snapshot.snapshot,
      snapshotTime: snapshot.snapshot.snapshotTime.toISOString(),
      createdAt: snapshot.snapshot.createdAt
        ? snapshot.snapshot.createdAt.toISOString()
        : new Date().toISOString(),
    },
    items: snapshot.items.map((item) => ({
      ...item,
      direction: item.direction.toLowerCase() as "long" | "short" | "neutral",
      createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
      riskReward: (item.riskReward ?? null) as RiskRewardSummary | null,
      eventContext: (item as { eventContext?: unknown }).eventContext ?? null,
    })),
    setups: snapshot.setups,
  };
}

export async function fetchTodaySetups(params?: { profile?: string | null }): Promise<{ setups: Setup[]; setupOfTheDayId: string }> {
  const schema = z.object({
    setups: setupSchema.array(),
    setupOfTheDayId: z.string(),
  });
  const url = params?.profile ? `/api/setups/today?profile=${params.profile}` : "/api/setups/today";
  const data = await fetcher(resolveUrl(url), schema);
  return data;
}
