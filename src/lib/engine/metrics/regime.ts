import type { Setup } from "@/src/lib/engine/types";

export type RegimeTag = "TREND" | "RANGE" | "MISSING";

function normalizeScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function deriveRegimeTag(setup: Setup): RegimeTag {
  const trend = normalizeScore((setup as { trendScore?: number | null }).trendScore ?? setup.rings?.trendScore);
  const momentum =
    normalizeScore((setup as { momentumScore?: number | null }).momentumScore) ??
    normalizeScore((setup.rings as { momentumScore?: number | null } | undefined)?.momentumScore) ??
    normalizeScore(setup.rings?.orderflowScore);
  const driftRaw = (setup as { sentiment?: { raw?: { driftPct?: number | null } } }).sentiment?.raw?.driftPct;
  const drift = typeof driftRaw === "number" ? driftRaw : null;

  if (trend === null) return "MISSING";
  const trendOk = trend >= 60;
  const momentumOk = (momentum ?? -Infinity) >= 55 || (drift ?? -Infinity) >= 0;
  if (trendOk && momentumOk) return "TREND";
  return "RANGE";
}
