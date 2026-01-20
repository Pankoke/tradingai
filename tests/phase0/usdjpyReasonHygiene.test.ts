import { describe, expect, it } from "vitest";

import { buildPhase0SummaryForAsset } from "@/src/app/api/admin/playbooks/phase0-gold-swing/route";
import type { Setup } from "@/src/lib/engine/types";

describe("USDJPY reason hygiene", () => {
  it("avoids index/crypto alignment noise and uses FX wording/segments", () => {
    const setup: Setup = {
      assetId: "usdjpy",
      assetClass: "fx",
      profile: "SWING",
      timeframeUsed: "1D",
      setupPlaybookId: "usdjpy-swing-v0.1",
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      setupGrade: "NO_TRADE",
    } as unknown as Setup;

    const summary = buildPhase0SummaryForAsset({
      rows: [{ setups: [setup], snapshotTime: new Date(), createdAt: new Date(), label: "test" }],
      assetId: "usdjpy",
      sampleWindowDays: 30,
      playbookId: null,
    });

    const reasons = summary.watchReasonsDistribution ?? summary.noTradeReasonsDistribution ?? summary.blockedReasonsDistribution ?? {};
    const keys = Object.keys(reasons);
    expect(keys.some((r) => r.toLowerCase().includes("index fallback"))).toBe(false);
    expect(keys.some((r) => r.toLowerCase().includes("crypto"))).toBe(false);
    expect(keys.some((r) => r.toLowerCase().includes("no default alignment"))).toBe(false);
    expect(keys.some((r) => r.toLowerCase().includes("alignment unavailable (fx)")) || keys.some((r) => r.toLowerCase().includes("watch"))).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });
});
