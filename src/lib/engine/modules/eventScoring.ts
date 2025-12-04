import type { Setup } from "@/src/lib/engine/types";
import type { Event, EventSeverity } from "@/src/lib/engine/eventsBiasTypes";

export type EventContext = {
  topEvents: Array<{
    id: string;
    title: string;
    category: string;
    severity: EventSeverity;
    scheduledAt: string;
    source?: string;
  }>;
};

export type EventScoreResult = {
  eventScore: number;
  context?: EventContext;
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
  const topEvents = [...relevantEvents]
    .sort((a, b) => {
      const rank = (value: EventSeverity): number =>
        value === "high" ? 3 : value === "medium" ? 2 : 1;
      const severityDiff = rank(b.severity) - rank(a.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      title: event.title,
      category: event.category,
      severity: event.severity,
      scheduledAt: event.startTime,
      source: event.source,
    }));

  const context = topEvents.length ? { topEvents } : undefined;
  return { eventScore, context };
}
