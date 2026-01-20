import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

type SetupLike = Setup | HomepageSetup | (Setup & HomepageSetup) | (HomepageSetup & Setup);

export type FxAlignment = "LONG" | "SHORT" | "NEUTRAL" | null;

/**
 * Derive a simple, deterministic FX alignment (LONG/SHORT/NEUTRAL) from available scores.
 * Inputs are intentionally limited to already-present stream fields.
 */
export function deriveFxAlignment(setup: SetupLike): FxAlignment {
  const biasScore = (setup as { biasScore?: number | null }).biasScore ?? null;
  const trendScore = (setup as { trendScore?: number | null }).trendScore ?? null;
  const directionRaw = (setup as { direction?: string | null }).direction ?? "";
  const direction =
    directionRaw.toLowerCase().includes("short") || directionRaw.toLowerCase().includes("sell")
      ? "SHORT"
      : directionRaw.toLowerCase().includes("long") || directionRaw.toLowerCase().includes("buy")
        ? "LONG"
        : null;

  // Strong directional cues override weaker scores
  if (direction === "LONG") return "LONG";
  if (direction === "SHORT") return "SHORT";

  const biasStrongLong = typeof biasScore === "number" && biasScore >= 70;
  const biasStrongShort = typeof biasScore === "number" && biasScore <= 40;
  const trendSupportiveLong = typeof trendScore === "number" && trendScore >= 55;
  const trendSupportiveShort = typeof trendScore === "number" && trendScore <= 45;

  if (biasStrongLong && trendSupportiveLong) return "LONG";
  if (biasStrongShort && trendSupportiveShort) return "SHORT";

  // Mixed or weak signals -> NEUTRAL (monitor)
  if (biasScore !== null || trendScore !== null) return "NEUTRAL";

  // Insufficient data
  return null;
}
