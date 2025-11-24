import type { Setup } from "@/src/lib/engine/types";

export function sortSetupsForToday(setups: Setup[]): Setup[] {
  const cloned = [...setups];
  return cloned.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.eventScore !== a.eventScore) return b.eventScore - a.eventScore;
    return a.symbol.localeCompare(b.symbol);
  });
}
