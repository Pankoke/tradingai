import type { Setup } from "@/src/lib/engine/types";

export type MarketStructureMetrics = {
  momentumScore: number;
  trendScore: number;
  levelQualityScore: number;
};

export function analyzeMarketStructure(setup: Setup): MarketStructureMetrics {
  // Platzhalter-Logik: leichte Variation anhand von timeframe und direction
  const baseMomentum = setup.direction === "Long" ? 55 : 50;
  const timeframeFactor = setup.timeframe.includes("H") ? 5 : setup.timeframe.includes("D") ? 8 : 3;

  return {
    momentumScore: Math.min(100, baseMomentum + timeframeFactor),
    trendScore: 50 + (setup.direction === "Long" ? 5 : -5),
    levelQualityScore: 50,
  };
}
