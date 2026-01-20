import { describe, expect, it } from "vitest";
import type { AssetPhase0Summary } from "@/scripts/build-weekly-health-report";
import { renderAssetSummarySection } from "@/scripts/build-weekly-health-report";

function makeSummary(assetId: string): AssetPhase0Summary {
  return {
    meta: { assetId, timeframe: "1D", sampleWindowDays: 30, labelsUsedCounts: { morning: 2, eod: 3 } },
    decisionDistribution: { TRADE_A: 1, TRADE_B: 1, WATCH: 2, BLOCKED: 0 },
    gradeDistribution: { A: 1, B: 0, NO_TRADE: 2 },
    watchSegmentsDistribution:
      assetId === "spx" || assetId === "dax" || assetId === "ndx" || assetId === "dow"
        ? { WATCH_VOLATILITY_HIGH: 2, WATCH_FAILS_BIAS_SOFT: 1 }
        : assetId === "eurusd" || assetId === "gbpusd" || assetId === "usdjpy" || assetId === "eurjpy"
          ? { WATCH_FAILS_BIAS: 2, WATCH_FAILS_CONFIDENCE: 1 }
          : undefined,
    alignmentDistribution:
      assetId === "eurusd" || assetId === "gbpusd" || assetId === "usdjpy" || assetId === "eurjpy"
        ? { LONG: 2, SHORT: 1, NEUTRAL: 0 }
        : undefined,
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
  const eurusd = makeSummary("eurusd");
  const gbpusd = makeSummary("gbpusd");
  const usdjpy = makeSummary("usdjpy");
  const eurjpy = makeSummary("eurjpy");
  const spx = makeSummary("spx");
  const dax = makeSummary("dax");
  const ndx = makeSummary("ndx");
  const dow = makeSummary("dow");

  const rendered = [gold, btc, eurusd, gbpusd, usdjpy, eurjpy, spx, dax, ndx, dow].map((s) => renderAssetSummarySection(s)).join("\n");

  expect(rendered).toContain("## GOLD Swing");
  expect(rendered).toContain("## BTC Swing");
  expect(rendered).toContain("## EURUSD Swing");
  expect(rendered).toContain("## GBPUSD Swing");
  expect(rendered).toContain("## USDJPY Swing");
  expect(rendered).toContain("## EURJPY Swing");
  expect(rendered).toContain("## SPX Swing");
  expect(rendered).toContain("## DAX Swing");
  expect(rendered).toContain("## NDX Swing");
  expect(rendered).toContain("## DOW Swing");
    expect(rendered).toContain("| TRADE_A | 1 |");
    expect(rendered).toContain("| TRADE_B | 1 |");
    expect(rendered).toContain("Volatility Buckets");
    expect(rendered).toContain("| low | 2 |");
    expect(rendered).toContain("Blocked Reasons");
    expect(rendered).toContain("NO_TRADE Reasons");
    expect(rendered).toContain("Labels Used");
    expect(rendered).toContain("| eod | 3 |");
  expect(rendered).toContain("WATCH Segments");
  expect(rendered).toContain("WATCH_VOLATILITY_HIGH");
  expect(rendered).toContain("DAX Swing");
  expect(rendered).toContain("WATCH_FAILS_BIAS_SOFT");
  expect(rendered).toContain("DOW Swing");
  expect(rendered).toContain("WATCH_FAILS_BIAS");
  expect(rendered).toContain("FX Alignment Distribution");
  expect(rendered).toContain("| LONG | 2 |");
  expect(rendered.toLowerCase()).not.toContain("no default alignment");
  });
});
