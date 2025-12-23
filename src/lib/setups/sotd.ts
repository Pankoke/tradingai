import type { Setup } from "@/src/lib/engine/types";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";

export function selectSwingSotd(setups: Setup[]): Setup | null {
  if (!setups.length) return null;
  const swing = setups.find((s) => {
    const profile = s.profile ?? deriveSetupProfileFromTimeframe(s.timeframe);
    return profile === "SWING";
  });
  return swing ?? setups[0];
}
