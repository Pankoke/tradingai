import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import type { Event, BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";

export type PerceptionHistoryEntry = {
  id: string;
  createdAt: string;
  snapshot: PerceptionSnapshot;
  events: Event[];
  biasSnapshot: BiasSnapshot | null;
};

const perceptionHistory: PerceptionHistoryEntry[] = [];
let sequence = 0;

function createHistoryId(): string {
  sequence += 1;
  return `${Date.now()}-${sequence}`;
}

export function addPerceptionHistoryEntry(input: {
  snapshot: PerceptionSnapshot;
  events: Event[];
  biasSnapshot: BiasSnapshot | null;
}): PerceptionHistoryEntry {
  const entry: PerceptionHistoryEntry = {
    id: createHistoryId(),
    createdAt: new Date().toISOString(),
    snapshot: input.snapshot,
    events: input.events,
    biasSnapshot: input.biasSnapshot,
  };

  perceptionHistory.push(entry);

  if (perceptionHistory.length > 50) {
    perceptionHistory.shift();
  }

  return entry;
}

export function getPerceptionHistory(limit?: number): PerceptionHistoryEntry[] {
  const sorted = [...perceptionHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (limit && limit > 0) {
    return sorted.slice(0, limit);
  }
  return sorted;
}

export function clearPerceptionHistory(): void {
  perceptionHistory.length = 0;
}
