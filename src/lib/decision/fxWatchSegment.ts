import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

type SetupLike = Setup | HomepageSetup | (Setup & HomepageSetup) | (HomepageSetup & Setup);

export const FX_WATCH_SEGMENTS = {
  FAILS_BIAS: "WATCH_FAILS_BIAS",
  FAILS_TREND: "WATCH_FAILS_TREND",
  FAILS_CONFIDENCE: "WATCH_FAILS_CONFIDENCE",
  EVENT_RISK_HIGH: "WATCH_EVENT_RISK_HIGH",
  OTHER: "WATCH_OTHER",
} as const;

export type FxWatchSegment = (typeof FX_WATCH_SEGMENTS)[keyof typeof FX_WATCH_SEGMENTS];

/**
 * Derive a Phase-0 WATCH segment for FX stream setups (e.g., EURUSD).
 * Precedence (first match wins):
 *  1) Event risk high (eventScore >= 70)
 *  2) Bias too weak (<65)
 *  3) Trend weak (<50)
 *  4) Confidence weak (<55)
 *  5) Other
 */
export function deriveFxWatchSegment(setup: SetupLike): FxWatchSegment {
  const eventScore = (setup as { eventScore?: number | null }).eventScore ?? null;
  const biasScore = (setup as { biasScore?: number | null }).biasScore ?? null;
  const trendScore = (setup as { trendScore?: number | null }).trendScore ?? null;
  const confidence = (setup as { confidence?: number | null }).confidence ?? null;

  if (typeof eventScore === "number" && eventScore >= 70) return FX_WATCH_SEGMENTS.EVENT_RISK_HIGH;
  if (typeof biasScore === "number" && biasScore < 65) return FX_WATCH_SEGMENTS.FAILS_BIAS;
  if (typeof trendScore === "number" && trendScore < 50) return FX_WATCH_SEGMENTS.FAILS_TREND;
  if (typeof confidence === "number" && confidence < 55) return FX_WATCH_SEGMENTS.FAILS_CONFIDENCE;
  return FX_WATCH_SEGMENTS.OTHER;
}
