import { computeSignalQuality, type SignalQuality } from "@/src/lib/engine/signalQuality";
import type { Setup } from "@/src/lib/engine/types";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";

type RingDeltaKey = "trend" | "event" | "bias" | "sentiment" | "orderflow" | "confidence";

const RING_KEYS: Array<{ key: RingDeltaKey; ringKey: keyof Setup["rings"] }> = [
  { key: "trend", ringKey: "trendScore" },
  { key: "event", ringKey: "eventScore" },
  { key: "bias", ringKey: "biasScore" },
  { key: "sentiment", ringKey: "sentimentScore" },
  { key: "orderflow", ringKey: "orderflowScore" },
  { key: "confidence", ringKey: "confidenceScore" },
];

export type SetupDiffEntry = {
  setup: Setup;
  quality: SignalQuality;
  matchKey: string;
};

export type SnapshotDiffChange = {
  setupId: string;
  symbol: string;
  direction?: string;
  timeframe?: string;
  current: SetupDiffEntry;
  previous: SetupDiffEntry;
  qualityDelta: number;
  ringDeltas: Partial<Record<RingDeltaKey, number>>;
  matchKey: string;
};

export type SnapshotDiffResult = {
  previousSnapshot: PerceptionSnapshotWithItems["snapshot"];
  added: SetupDiffEntry[];
  removed: SetupDiffEntry[];
  changed: SnapshotDiffChange[];
  topGainers: SnapshotDiffChange[];
  topLosers: SnapshotDiffChange[];
};

type SnapshotDiffParams = {
  current: PerceptionSnapshotWithItems;
  previous: PerceptionSnapshotWithItems;
};

const STATUS_LIMIT = 5;

export function getSetupMatchKey(setup: Setup): string {
  if (setup.id) {
    return setup.id;
  }
  const fallback = [setup.symbol, setup.direction, setup.timeframe].filter(Boolean).join("-");
  return fallback || Math.random().toString(36);
}

function buildEntry(setup: Setup): SetupDiffEntry {
  return {
    setup,
    quality: computeSignalQuality(setup),
    matchKey: getSetupMatchKey(setup),
  };
}

function diffValue(current?: number | null, previous?: number | null): number | null {
  if (typeof current !== "number" || Number.isNaN(current)) return null;
  if (typeof previous !== "number" || Number.isNaN(previous)) return null;
  const delta = Math.round(current - previous);
  if (delta === 0) return 0;
  return delta;
}

export function diffSnapshots({ current, previous }: SnapshotDiffParams): SnapshotDiffResult {
  const previousSnapshot = previous.snapshot;

  const previousMap = new Map<string, SetupDiffEntry>();
  previous.setups.forEach((setup) => {
    const entry = buildEntry(setup);
    previousMap.set(entry.matchKey, entry);
  });

  const currentMap = new Map<string, SetupDiffEntry>();
  current.setups.forEach((setup) => {
    const entry = buildEntry(setup);
    currentMap.set(entry.matchKey, entry);
  });

  const added: SetupDiffEntry[] = [];
  const changed: SnapshotDiffChange[] = [];

  currentMap.forEach((entry, key) => {
    const prevEntry = previousMap.get(key);
    if (!prevEntry) {
      added.push(entry);
      return;
    }

    const ringDeltas: Partial<Record<RingDeltaKey, number>> = {};
    let hasRingChange = false;
    for (const ringKey of RING_KEYS) {
      const currentValue = entry.setup.rings?.[ringKey.ringKey];
      const previousValue = prevEntry.setup.rings?.[ringKey.ringKey];
      const delta = diffValue(currentValue, previousValue);
      if (delta !== null && delta !== 0) {
        ringDeltas[ringKey.key] = delta;
        hasRingChange = true;
      }
    }

    const qualityDelta = entry.quality.score - prevEntry.quality.score;
    if (qualityDelta !== 0 || hasRingChange) {
      changed.push({
        setupId: entry.setup.id,
        symbol: entry.setup.symbol,
        direction: entry.setup.direction,
        timeframe: entry.setup.timeframe,
        current: entry,
        previous: prevEntry,
        qualityDelta,
        ringDeltas,
        matchKey: entry.matchKey,
      });
    }
  });

  const removed: SetupDiffEntry[] = [];
  previousMap.forEach((entry, key) => {
    if (!currentMap.has(key)) {
      removed.push(entry);
    }
  });

  const topGainers = changed
    .filter((item) => item.qualityDelta > 0)
    .sort((a, b) => b.qualityDelta - a.qualityDelta)
    .slice(0, STATUS_LIMIT);

  const topLosers = changed
    .filter((item) => item.qualityDelta < 0)
    .sort((a, b) => a.qualityDelta - b.qualityDelta)
    .slice(0, STATUS_LIMIT);

  return {
    previousSnapshot,
    added,
    removed,
    changed,
    topGainers,
    topLosers,
  };
}
