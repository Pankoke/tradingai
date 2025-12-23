import { deriveSetupProfileFromTimeframe, type SetupProfile } from "@/src/lib/config/setupProfile";
import type { Setup } from "@/src/lib/engine/types";

export type ProfileFilter = "all" | "swing" | "intraday" | "position";

export function parseProfileFilter(raw?: string | null): ProfileFilter {
  const normalized = (raw ?? "").toLowerCase();
  if (normalized === "intraday") return "intraday";
  if (normalized === "position") return "position";
  if (normalized === "all") return "all";
  return "swing";
}

function resolveProfile(setup: Pick<Setup, "profile" | "timeframe">): SetupProfile {
  if (setup.profile === "SCALP" || setup.profile === "INTRADAY" || setup.profile === "SWING" || setup.profile === "POSITION") {
    return setup.profile;
  }
  return deriveSetupProfileFromTimeframe(setup.timeframe);
}

export function filterSetupsByProfile<T extends Pick<Setup, "profile" | "timeframe">>(
  setups: T[],
  filter: ProfileFilter,
): T[] {
  if (filter === "all") return setups;
  return setups.filter((setup) => {
    const profile = resolveProfile(setup);
    if (filter === "swing") return profile === "SWING";
    if (filter === "intraday") return profile === "INTRADAY";
    if (filter === "position") return profile === "POSITION";
    return true;
  });
}

export function isProfileEmpty(filter: ProfileFilter, filteredCount: number): boolean {
  return filter !== "all" && filteredCount === 0;
}
