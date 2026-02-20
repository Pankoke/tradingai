import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import { isPerceptionMockMode } from "@/src/lib/config/perceptionDataMode";
import { buildPerceptionSnapshotWithContainer } from "@/src/server/perception/perceptionEngineFactory";
import type { Setup } from "@/src/lib/engine/types";

type MarketingOverviewPayload = {
  universeAssetsTotal: number;
  activeSetups: number;
  engineVersion: string;
  latestSnapshotTime: string;
};

const ACTIVE_DECISIONS = new Set(["TRADE", "WATCH", "WATCH_PLUS"]);

function isActiveSetup(setup: Setup): boolean {
  const decisionRaw =
    (setup as { decision?: string | null }).decision ??
    (setup as { setupDecision?: string | null }).setupDecision ??
    null;
  const decision = typeof decisionRaw === "string" ? decisionRaw.toUpperCase() : null;
  const gradeRaw =
    (setup as { setupGrade?: string | null }).setupGrade ??
    (setup as { grade?: string | null }).grade ??
    null;
  const grade = typeof gradeRaw === "string" ? gradeRaw.toUpperCase() : null;
  return Boolean(decision && ACTIVE_DECISIONS.has(decision) && grade !== "NO_TRADE");
}

export async function GET(): Promise<Response> {
  try {
    const activeAssets = await getActiveAssets();
    const universeAssetsTotal = activeAssets.length;

    if (isPerceptionMockMode()) {
      const mockSnapshot = await buildPerceptionSnapshotWithContainer({ allowSync: false });
      const setups = mockSnapshot.setups ?? [];
      const activeFromDecision = setups.filter(isActiveSetup).length;
      const activeFromGrade = setups.filter((setup) => {
        const gradeRaw =
          (setup as { setupGrade?: string | null }).setupGrade ??
          (setup as { grade?: string | null }).grade ??
          null;
        const grade = typeof gradeRaw === "string" ? gradeRaw.toUpperCase() : null;
        return grade !== "NO_TRADE";
      }).length;
      const activeSetups =
        activeFromDecision > 0
          ? activeFromDecision
          : activeFromGrade > 0
            ? activeFromGrade
            : Math.max(3, Math.min(setups.length, 8));
      return respondOk<MarketingOverviewPayload>({
        universeAssetsTotal,
        activeSetups,
        engineVersion: mockSnapshot.version ?? "unknown",
        latestSnapshotTime: mockSnapshot.generatedAt ?? new Date().toISOString(),
      });
    }

    const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
    const latest = await snapshotStore.loadLatestSnapshotFromStore();
    if (!latest) {
      return respondOk<MarketingOverviewPayload>({
        universeAssetsTotal,
        activeSetups: 0,
        engineVersion: "unknown",
        latestSnapshotTime: "",
      });
    }

    const setups = (latest.setups ?? []) as Setup[];
    const activeSetups = setups.filter(isActiveSetup).length;

    return respondOk<MarketingOverviewPayload>({
      universeAssetsTotal,
      activeSetups,
      engineVersion: latest.snapshot.version ?? "unknown",
      latestSnapshotTime: latest.snapshot.snapshotTime
        ? new Date(latest.snapshot.snapshotTime).toISOString()
        : "",
    });
  } catch (error) {
    return respondFail(
      "INTERNAL_ERROR",
      "Failed to load marketing overview",
      500,
      error instanceof Error ? { message: error.message } : undefined,
    );
  }
}
