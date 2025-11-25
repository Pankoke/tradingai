import type { Setup } from "@/src/lib/engine/types";
import type { Event } from "@/src/lib/engine/eventsBiasTypes";

export type EventScoreResult = {
  eventScore: number;
};

function hashSymbolTimeframe(setup: Setup): number {
  const key = `${setup.symbol}-${setup.timeframe}`;
  return key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyEventScoring(setup: Setup, events: Event[]): EventScoreResult {
  const hash = hashSymbolTimeframe(setup);
  const base = (hash % 41) + 40; // 40–80 baseline

  const relevantEvents = events.filter(
    (event) => event.symbols.length === 0 || event.symbols.includes(setup.symbol),
  );

  const severityBonus = relevantEvents.reduce((bonus, event) => {
    if (event.severity === "high") return bonus + 12;
    if (event.severity === "medium") return bonus + 8;
    return bonus + 3;
  }, 0);

  const eventScore = clamp(base + severityBonus, 0, 100);
  return { eventScore };
}
