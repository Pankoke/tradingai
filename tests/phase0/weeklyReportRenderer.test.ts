import { describe, expect, it } from "vitest";
import type { AssetPhase0Summary } from "@/scripts/build-weekly-health-report";
import { renderAssetSummarySection } from "@/scripts/build-weekly-health-report";

function makeSummary(assetId: string): AssetPhase0Summary {
  return {
    meta: { assetId, timeframe: "1D", sampleWindowDays: 30, labelsUsedCounts: { morning: 2, eod: 3 } },
    decisionDistribution: { TRADE_A: 1, TRADE_B: 1, WATCH: 2, BLOCKED: 0 },
    gradeDistribution: { A: 1, B: 0, NO_TRADE: 2 },
    diagnostics:
      assetId === "spx"
        ? {
            regimeDistribution: { TREND: 2, RANGE: 1 },
            volatilityBuckets: [
              { bucket: "low", count: 2 },
              { bucket: "medium", count: 1 },
            ],
          }
        : undefined,
    blockedReasonsDistribution: assetId === "spx" ? { "High volatility": 3 } : undefined,
    noTradeReasonsDistribution: { "Regime range": 2 },
  };
}

describe("renderAssetSummarySection", () => {
  it("renders headings for multiple assets", () => {
    const gold = makeSummary("gold");
    const btc = makeSummary("btc");
    const spx = makeSummary("spx");

    const rendered = [gold, btc, spx].map((s) => renderAssetSummarySection(s)).join("\n");

    expect(rendered).toContain("## GOLD Swing");
    expect(rendered).toContain("## BTC Swing");
    expect(rendered).toContain("## SPX Swing");
    expect(rendered).toContain("| TRADE_A | 1 |");
    expect(rendered).toContain("| TRADE_B | 1 |");
    expect(rendered).toContain("Volatility Buckets");
    expect(rendered).toContain("| low | 2 |");
    expect(rendered).toContain("Blocked Reasons");
    expect(rendered).toContain("NO_TRADE Reasons");
    expect(rendered).toContain("Labels Used");
    expect(rendered).toContain("| eod | 3 |");
  });
});
