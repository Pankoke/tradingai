import { describe, expect, it } from "vitest";

import { buildPhase0SummaryForAsset } from "@/src/app/api/admin/playbooks/phase0-gold-swing/route";
import type { Setup } from "@/src/lib/engine/types";

describe("BTC reason hygiene", () => {
  it("ignores routing/debug reasons like 'crypto hyphen USD' in canonical reason", () => {
    const setup: Setup = {
      assetId: "BTC",
      profile: "SWING",
      timeframeUsed: "1D",
      setupGrade: "NO_TRADE",
      noTradeReason: "crypto hyphen USD",
    } as unknown as Setup;

    const summary = buildPhase0SummaryForAsset({
      rows: [{ setups: [setup], snapshotTime: new Date(), createdAt: new Date(), label: "test" }],
      assetId: "btc",
      sampleWindowDays: 30,
      playbookId: null,
    });

    const reasons = summary.noTradeReasonsDistribution ?? {};
    expect(Object.keys(reasons)).not.toContain("crypto hyphen USD");
  });

  it("does not emit index fallback or 'No default alignment' for crypto alignment gaps", () => {
    const setup: Setup = {
      assetId: "btc",
      assetClass: "crypto",
      profile: "SWING",
      timeframeUsed: "1D",
      setupPlaybookId: "crypto-swing-v0.1",
      setupDecision: "BLOCKED",
      decisionReasons: ["No default alignment"],
      direction: "Short",
      setupGrade: "NO_TRADE",
    } as unknown as Setup;

    const summary = buildPhase0SummaryForAsset({
      rows: [{ setups: [setup], snapshotTime: new Date(), createdAt: new Date(), label: "test" }],
      assetId: "btc",
      sampleWindowDays: 30,
      playbookId: null,
    });

    const reasons = summary.watchReasonsDistribution ?? summary.noTradeReasonsDistribution ?? {};
    const reasonKeys = Object.keys(reasons);
    expect(reasonKeys.some((r) => r.toLowerCase().includes("index fallback"))).toBe(false);
    expect(reasonKeys).not.toContain("No default alignment");
    expect(reasonKeys.some((r) => r === "Alignment unavailable (crypto)")).toBe(true);
  });
});
