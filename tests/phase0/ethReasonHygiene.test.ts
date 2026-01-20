import { describe, expect, it } from "vitest";

import { buildPhase0SummaryForAsset } from "@/src/app/api/admin/playbooks/phase0-gold-swing/route";
import type { Setup } from "@/src/lib/engine/types";

describe("ETH reason hygiene", () => {
  it("avoids index fallback / no default alignment and uses crypto alignment wording", () => {
    const setup: Setup = {
      assetId: "eth",
      assetClass: "crypto",
      profile: "SWING",
      timeframeUsed: "1D",
      setupPlaybookId: "crypto-swing-v0.1",
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      setupGrade: "NO_TRADE",
    } as unknown as Setup;

    const summary = buildPhase0SummaryForAsset({
      rows: [{ setups: [setup], snapshotTime: new Date(), createdAt: new Date(), label: "test" }],
      assetId: "eth",
      sampleWindowDays: 30,
      playbookId: null,
    });

    const reasons =
      summary.watchReasonsDistribution ??
      summary.noTradeReasonsDistribution ??
      summary.blockedReasonsDistribution ??
      {};
    const keys = Object.keys(reasons);
    expect(keys.some((r) => r.toLowerCase().includes("index fallback"))).toBe(false);
    expect(keys).not.toContain("No default alignment");
    expect(keys.some((r) => r === "Alignment unavailable (crypto)")).toBe(true);
  });
});
