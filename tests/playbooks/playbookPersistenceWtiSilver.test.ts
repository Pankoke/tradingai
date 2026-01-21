import { describe, expect, it } from "vitest";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";

describe("playbook persistence for wti/silver swing", () => {
  it("falls back to energy/metals playbook even if generic would be chosen", async () => {
    // Minimal synthetic snapshot build: use symbol/assetId that would otherwise resolve generic if guard failed.
    const snapshot = await buildAndStorePerceptionSnapshot({
      snapshotTime: new Date(),
      profiles: ["SWING"],
      assetFilter: ["wti", "silver"],
      allowSync: false,
      source: "admin",
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
