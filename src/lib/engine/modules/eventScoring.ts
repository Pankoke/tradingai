import type { Setup } from "@/src/lib/engine/types";

export type EventScoreResult = {
  eventScore: number;
};

function hashSymbolTimeframe(setup: Setup): number {
  const key = `${setup.symbol}-${setup.timeframe}`;
  return key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function applyEventScoring(setup: Setup): EventScoreResult {
  const hash = hashSymbolTimeframe(setup);
  const base = (hash % 41) + 60; // 60–100
  return { eventScore: Math.min(100, Math.max(0, base)) };
}
