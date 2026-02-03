import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { buildPerceptionSnapshotWithContainer } from "@/src/server/perception/perceptionEngineFactory";
import { isPerceptionMockMode } from "@/src/lib/config/perceptionDataMode";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import { logger } from "@/src/lib/logger";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import type { Setup } from "@/src/lib/engine/types";

type PerceptionTodayPayload = PerceptionSnapshotWithItems & { reused?: boolean };

export async function GET(request: Request): Promise<Response> {
  if (isPerceptionMockMode()) {
    const fallback = await buildEngineSnapshotResponse("mock");
    return respondOk<PerceptionTodayPayload>(fallback);
  }

  const profileParam = new URL(request.url).searchParams.get("profile");
  const startedAt = Date.now();
  try {
    const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
    const fromStore = await snapshotStore.loadLatestSnapshotForProfile(profileParam);
    if (fromStore.snapshot) {
      const meta = buildMeta(fromStore.snapshot.snapshot.snapshotTime, {
        requestedProfile: fromStore.requestedProfile,
        fulfilledLabel: fromStore.fulfilledLabel,
        requestedAvailable: fromStore.requestedAvailable,
        fallbackUsed: fromStore.fallbackUsed,
      });
      const normalizedSnapshot = {
        ...fromStore.snapshot,
        snapshot: {
          ...fromStore.snapshot.snapshot,
          version: fromStore.snapshot.snapshot.version ?? "unknown",
          dataMode: fromStore.snapshot.snapshot.dataMode ?? "live",
          setups: fromStore.snapshot.snapshot.setups ?? [],
        },
      } as unknown as PerceptionSnapshotWithItems;
      const payload = { ...normalizedSnapshot, meta } as PerceptionTodayPayload & { meta: Record<string, unknown> };
      return respondOk(payload);
    }

    const now = new Date();
    const emptySnapshot: PerceptionSnapshotWithItems = {
      snapshot: {
        id: "missing",
        snapshotTime: now,
        label: null,
        version: "v1.0.0",
        dataMode: "live",
        generatedMs: null,
        notes: null,
        setups: [],
        createdAt: now,
      },
      items: [],
      setups: [],
    };
    const meta = {
      requestedProfile: fromStore.requestedProfile,
      fulfilledLabel: null,
      requestedAvailable: false,
      fallbackUsed: false,
      snapshotAvailable: false,
      snapshotAgeMinutes: null,
      isStale: true,
    };
    return respondOk<PerceptionTodayPayload & { meta: Record<string, unknown> }>({
      ...emptySnapshot,
      meta,
    });
  } catch (error) {
    logger.error("Failed to load perception snapshot", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return respondFail("INTERNAL_ERROR", "Failed to load snapshot", 500, {
      durationMs: Date.now() - startedAt,
    });
  }
}

async function buildEngineSnapshotResponse(mode: "mock" | "fallback"): Promise<PerceptionSnapshotWithItems> {
  const snapshot = await buildPerceptionSnapshotWithContainer({ allowSync: false });
  const fallbackSnapshotTime = new Date();
  const isoCreatedAt = fallbackSnapshotTime.toISOString();
  const snapshotId = `${mode}-${Date.now()}`;
  const setupsWithMetadata = snapshot.setups.map((setup: Setup) => ({
    ...setup,
    snapshotId,
    snapshotCreatedAt: isoCreatedAt,
  }));
  return {
    snapshot: {
      id: snapshotId,
      snapshotTime: fallbackSnapshotTime,
      label: null,
      version: snapshot.version,
      dataMode: mode === "mock" ? "mock" : "live",
      generatedMs: null,
      notes: JSON.stringify({ source: mode }),
      setups: setupsWithMetadata,
      createdAt: fallbackSnapshotTime,
    },
    items: [],
    setups: setupsWithMetadata,
  };
}

function buildMeta(
  snapshotTime: Date | string | undefined,
  base: {
    requestedProfile: string | null;
    fulfilledLabel: string | null;
    requestedAvailable: boolean;
    fallbackUsed: boolean;
  },
) {
  const parsedTime = snapshotTime ? new Date(snapshotTime) : null;
  const ageMinutes = parsedTime ? Math.round((Date.now() - parsedTime.getTime()) / 60000) : null;
  const thresholdMinutes = base.requestedProfile === "intraday" ? 90 : 12 * 60;
  const isStale = ageMinutes != null ? ageMinutes > thresholdMinutes : true;
  return {
    ...base,
    snapshotAvailable: true,
    snapshotAgeMinutes: ageMinutes,
    isStale,
    fallback: base.fallbackUsed,
  };
}
