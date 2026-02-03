import { describe, expect, it } from "vitest";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import { buildPerceptionSnapshotWithContainer } from "@/src/server/perception/perceptionEngineFactory";

describe("playbook persistence for wti/silver swing", () => {
  it("falls back to energy/metals playbook even if generic would be chosen", async () => {
    // Minimal synthetic snapshot build: use symbol/assetId that would otherwise resolve generic if guard failed.
    const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
    const snapshot = await buildAndStorePerceptionSnapshot({
      snapshotTime: new Date(),
      profiles: ["SWING"],
      assetFilter: ["wti", "silver"],
      allowSync: false,
      source: "admin",
      snapshotStore,
      deps: {
        buildPerceptionSnapshot: async (opts) => await buildPerceptionSnapshotWithContainer(opts),
        getActiveAssets: async () => [],
        maybeEnhanceRingAiSummaryWithLLM: async ({ heuristic }) => heuristic,
      },
    });
    const setups = (snapshot.setups ?? []).filter(
      (s) => (s.assetId === "wti" || s.assetId === "silver") && (s.timeframe ?? "").toString().toUpperCase().startsWith("1"),
    );
    expect(setups.length).toBeGreaterThan(0);
    for (const setup of setups) {
      expect(setup.playbookId ?? setup.setupPlaybookId).toBeDefined();
      const pb = (setup.playbookId ?? setup.setupPlaybookId ?? "").toString();
      if (setup.assetId === "wti") {
        expect(pb).toBe("energy-swing-v0.1");
      }
      if (setup.assetId === "silver") {
        expect(pb).toBe("metals-swing-v0.1");
      }
    }
  });
});
