import { getEventsInRange, type Event as DbEvent } from "@/src/server/repositories/eventRepository";
import type { RingTimeframe, Setup } from "@/src/lib/engine/types";

export type EventRingWindow = {
  windowFrom: Date;
  windowTo: Date;
  windowKind: RingTimeframe;
};

type AnalyzeParams = {
  events: DbEvent[];
  now: Date;
  window: EventRingWindow;
};

export type EventRingTopEvent = {
  title: string;
  scheduledAt: string;
  impact: number;
  category: string;
  timeToEventMinutes: number;
};

export type EventRingContext = EventRingWindow & {
  eventCountInWindow: number;
  notes: string[];
  topEvents: EventRingTopEvent[];
};

export type EventRingResult = {
  score: number;
  context: EventRingContext;
};

const NOTE_NO_EVENTS = "no_relevant_events";
const NOTE_HIGH_IMPACT_SOON = "high_impact_soon";
const NOTE_CLUSTERED = "clustered_events";

const IMPACT_WEIGHT: Record<number, number> = {
  1: 0.25,
  2: 0.6,
  3: 1,
};

const BASELINE_NO_EVENTS = 45;
const BASELINE_WITH_EVENTS = 40;
const MAX_WEIGHT_TARGET = 3;
const IMPACT_SEVERITY: Record<number, "low" | "medium" | "high"> = {
  1: "low",
  2: "medium",
  3: "high",
};

export function resolveEventRingWindow(setup: Pick<Setup, "timeframe" | "category">, now = new Date()): EventRingWindow {
  const kind = classifyWindowKind(setup);
  const nowMs = now.getTime();

  const offsets: Record<RingTimeframe, { backMs: number; forwardMs: number }> = {
    intraday: { backMs: 30 * 60 * 1000, forwardMs: 6 * 60 * 60 * 1000 },
    daily: { backMs: 6 * 60 * 60 * 1000, forwardMs: 24 * 60 * 60 * 1000 },
    swing: { backMs: 24 * 60 * 60 * 1000, forwardMs: 3 * 24 * 60 * 60 * 1000 },
    unknown: { backMs: 6 * 60 * 60 * 1000, forwardMs: 24 * 60 * 60 * 1000 },
  };

  const windowOffsets = offsets[kind] ?? offsets.unknown;
  return {
    windowKind: kind,
    windowFrom: new Date(nowMs - windowOffsets.backMs),
    windowTo: new Date(nowMs + windowOffsets.forwardMs),
  };
}

function classifyWindowKind(setup: Pick<Setup, "timeframe" | "category">): RingTimeframe {
  const timeframe = setup.timeframe?.toLowerCase() ?? "";
  const category = setup.category?.toLowerCase() ?? "";

  if (/\b(min|m|minute|hour|h)\b/.test(timeframe) || /\d+\s*(m|h)\b/.test(timeframe)) {
    return "intraday";
  }
  if (/\b(day|daily|1d|d1)\b/.test(timeframe) || /d$/.test(timeframe)) {
    return "daily";
  }
  if (/\b(week|wk|swing|swing)\b/.test(timeframe) || /\d+\s*w\b/.test(timeframe)) {
    return "swing";
  }
  if (category.includes("swing")) {
    return "swing";
  }
  if (category.includes("intraday")) {
    return "intraday";
  }
  return "unknown";
}

export async function computeEventRingV2(params: { setup: Setup; now?: Date }): Promise<EventRingResult> {
  const now = params.now ?? new Date();
  const window = resolveEventRingWindow(params.setup, now);
  const rows = await getEventsInRange({ from: window.windowFrom, to: window.windowTo });

  const analysis = analyzeEventsForWindow({
    events: rows,
    now,
    window,
  });

  return {
    score: analysis.score,
    context: {
      ...window,
      eventCountInWindow: analysis.eventCount,
      notes: analysis.notes,
      topEvents: analysis.topEvents,
    },
  };
}

type WindowAnalysis = {
  score: number;
  notes: string[];
  eventCount: number;
  topEvents: EventRingTopEvent[];
};

export function analyzeEventsForWindow({ events, now, window }: AnalyzeParams): WindowAnalysis {
  const sorted = [...events].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  if (sorted.length === 0) {
    return {
      score: BASELINE_NO_EVENTS,
      notes: [NOTE_NO_EVENTS],
      eventCount: 0,
      topEvents: [],
    };
  }

  const nowMs = now.getTime();
  const forwardSpan = Math.max(window.windowTo.getTime() - nowMs, 1);
  const backwardSpan = Math.max(nowMs - window.windowFrom.getTime(), 1);

  let weightSum = 0;
  let hasHighImpactSoon = false;

  const enrichedEvents = sorted.map((event) => {
    const impact = typeof event.impact === "number" ? event.impact : 1;
    const impactWeight = IMPACT_WEIGHT[impact] ?? IMPACT_WEIGHT[1];
    const diffMs = event.scheduledAt.getTime() - nowMs;
    const span = diffMs >= 0 ? forwardSpan : backwardSpan;
    const timeWeight = Math.max(0.1, 1 - Math.min(Math.abs(diffMs) / span, 1));
    weightSum += impactWeight * timeWeight;

    const timeToEventMinutes = Math.round(diffMs / 60000);
    if (impact === 3 && timeToEventMinutes >= 0 && timeToEventMinutes <= 60) {
      hasHighImpactSoon = true;
    }

    return {
      title: event.title,
      impact,
      category: event.category,
      scheduledAt: event.scheduledAt,
      timeToEventMinutes,
      priorityScore: impactWeight * timeWeight,
    };
  });

  const normalized = Math.min(weightSum / MAX_WEIGHT_TARGET, 1);
  const density = Math.min(Math.log1p(sorted.length) / Math.log(1 + 10), 1);

  let score = Math.round(BASELINE_WITH_EVENTS + normalized * 45 + density * 15);
  const notes: string[] = [];

  if (hasHighImpactSoon) {
    notes.push(NOTE_HIGH_IMPACT_SOON);
    score += 8;
  }
  if (sorted.length >= 3) {
    notes.push(NOTE_CLUSTERED);
    score += 5;
  }

  score = Math.min(100, score);

  const topEvents: EventRingTopEvent[] = enrichedEvents
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3)
    .map((event) => ({
      title: event.title,
      scheduledAt: event.scheduledAt.toISOString(),
      impact: event.impact,
      category: event.category,
      timeToEventMinutes: event.timeToEventMinutes,
    }));

  return {
    score,
    notes,
    eventCount: sorted.length,
    topEvents,
  };
}

export function buildSetupEventContext(context: EventRingContext): Setup["eventContext"] {
  return {
    windowFrom: context.windowFrom.toISOString(),
    windowTo: context.windowTo.toISOString(),
    windowKind: context.windowKind,
    eventCount: context.eventCountInWindow,
    notes: context.notes.length ? context.notes : undefined,
    topEvents:
      context.topEvents.length > 0
        ? context.topEvents.map((event) => ({
            title: event.title,
            scheduledAt: event.scheduledAt,
            category: event.category,
            severity: IMPACT_SEVERITY[event.impact] ?? "low",
            source: "jb-news",
            impact: event.impact,
            timeToEventMinutes: event.timeToEventMinutes,
          }))
        : [],
  };
}
