import type { Setup } from "@/src/lib/engine/types";

const FALLBACK_NOTES = new Set(["hash_fallback", "events_db_unavailable", "events_table_missing"]);

const PRIORITY_NOTES = ["high_impact_soon", "clustered_events", "no_relevant_events"] as const;

export type EventSignalNote = (typeof PRIORITY_NOTES)[number];

export type EventRiskKey = "calm" | "elevated" | "highSoon" | "unknown";

export type EventContextInsights = {
  riskKey: EventRiskKey | null;
  hasFallback: boolean;
  primaryNote: EventSignalNote | null;
};

const NOTE_TO_RISK_KEY: Record<EventSignalNote, Exclude<EventRiskKey, "unknown">> = {
  high_impact_soon: "highSoon",
  clustered_events: "elevated",
  no_relevant_events: "calm",
};

export function analyzeEventContext(
  context: Setup["eventContext"] | null | undefined,
): EventContextInsights {
  const notes = context?.notes ?? [];
  const hasFallback = notes.some((note) => FALLBACK_NOTES.has(note));
  if (hasFallback) {
    return { riskKey: "unknown", hasFallback: true, primaryNote: null };
  }
  for (const note of PRIORITY_NOTES) {
    if (notes.includes(note)) {
      return { riskKey: NOTE_TO_RISK_KEY[note], hasFallback: false, primaryNote: note };
    }
  }
  return { riskKey: null, hasFallback: false, primaryNote: null };
}

export type PrimaryEventCandidate = {
  title: string | undefined;
  timeToEventMinutes: number | null;
};

export function pickPrimaryEventCandidate(
  context: Setup["eventContext"] | null | undefined,
): PrimaryEventCandidate | null {
  const candidates = context?.topEvents ?? [];
  if (!candidates || candidates.length === 0) {
    return null;
  }
  const sortable = candidates
    .map((event) => {
      const minutes =
        typeof event.timeToEventMinutes === "number" && Number.isFinite(event.timeToEventMinutes)
          ? event.timeToEventMinutes
          : null;
      return { title: event.title, timeToEventMinutes: minutes };
    })
    .filter((item) => item.title || item.timeToEventMinutes !== null);
  if (sortable.length === 0) {
    return { title: candidates[0]?.title, timeToEventMinutes: null };
  }
  sortable.sort((a, b) => {
    const aVal = a.timeToEventMinutes ?? Number.POSITIVE_INFINITY;
    const bVal = b.timeToEventMinutes ?? Number.POSITIVE_INFINITY;
    return Math.abs(aVal) - Math.abs(bVal);
  });
  return sortable[0] ?? null;
}
