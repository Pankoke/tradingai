import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

type SetupLike = Setup | HomepageSetup | (Setup & HomepageSetup) | (HomepageSetup & Setup);

export const SPX_WATCH_SEGMENTS = {
  VOLATILITY_HIGH: "WATCH_VOLATILITY_HIGH",
  EVENT_RISK_HIGH: "WATCH_EVENT_RISK_HIGH",
  DIRECTION_UNKNOWN: "WATCH_DIRECTION_UNKNOWN",
  FAILS_BIAS_SOFT: "WATCH_FAILS_BIAS_SOFT",
  FAILS_BIAS_NEAR: "WATCH_FAILS_BIAS_NEAR",
  FAILS_CONFIDENCE: "WATCH_FAILS_CONFIDENCE",
  VOLATILITY_ELEVATED: "WATCH_VOLATILITY_ELEVATED",
  OTHER: "WATCH_OTHER",
} as const;

type SpxWatchSegment = (typeof SPX_WATCH_SEGMENTS)[keyof typeof SPX_WATCH_SEGMENTS];

/**
 * Derive a Phase-0 WATCH segment for SPX/index stream setups that lack full engine signals.
 * Precedence (first match wins):
 *  1) High volatility
 *  2) Event risk high
 *  3) Direction unknown
 *  4) Bias soft / bias near
 *  5) Confidence low
 *  6) Volatility elevated
 *  7) Other
 */
export function deriveSpxWatchSegment(setup: SetupLike): SpxWatchSegment {
  const volatilityLabel = ((setup as { riskReward?: { volatilityLabel?: string | null } }).riskReward?.volatilityLabel ?? "")
    .toString()
    .toLowerCase();
  const eventScore = (setup as { eventScore?: number | null }).eventScore ?? null;
  const directionRaw = ((setup as { direction?: string | null }).direction ?? "").toString().trim();
  const biasScore = (setup as { biasScore?: number | null }).biasScore ?? null;
  const confidence = (setup as { confidence?: number | null }).confidence ?? null;

  if (volatilityLabel === "high") return SPX_WATCH_SEGMENTS.VOLATILITY_HIGH;
  if (typeof eventScore === "number" && eventScore >= 70) return SPX_WATCH_SEGMENTS.EVENT_RISK_HIGH;
  if (!directionRaw.length) return SPX_WATCH_SEGMENTS.DIRECTION_UNKNOWN;
  if (typeof biasScore === "number" && biasScore < 65) return SPX_WATCH_SEGMENTS.FAILS_BIAS_SOFT;
  if (typeof biasScore === "number" && biasScore < 70) return SPX_WATCH_SEGMENTS.FAILS_BIAS_NEAR;
  if (typeof confidence === "number" && confidence < 55) return SPX_WATCH_SEGMENTS.FAILS_CONFIDENCE;
  if (volatilityLabel === "medium" || volatilityLabel === "elevated") return SPX_WATCH_SEGMENTS.VOLATILITY_ELEVATED;
  return SPX_WATCH_SEGMENTS.OTHER;
}

export type { SpxWatchSegment };
