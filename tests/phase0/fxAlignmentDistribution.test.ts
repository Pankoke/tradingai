import { describe, expect, it } from "vitest";

import { renderAssetSummarySection } from "@/scripts/build-weekly-health-report";
import type { AssetPhase0Summary } from "@/scripts/build-weekly-health-report";

describe("FX alignment distribution rendering", () => {
  it("renders FX Alignment Distribution block when provided", () => {
    const summary: AssetPhase0Summary = {
      meta: { assetId: "eurusd", timeframe: "1D", sampleWindowDays: 30 },
      decisionDistribution: { TRADE: 0, WATCH: 3, BLOCKED: 0 },
      alignmentDistribution: { LONG: 2, SHORT: 1, NEUTRAL: 0 },
    };

    const md = renderAssetSummarySection(summary, "EURUSD Swing");
    expect(md).toContain("FX Alignment Distribution");
    expect(md).toContain("| LONG | 2 |");
    expect(md).toContain("| SHORT | 1 |");
  });
});

