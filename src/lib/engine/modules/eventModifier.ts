import type { EventModifier } from "@/src/lib/engine/types";
import type { Setup } from "@/src/lib/engine/types";

type BuildParams = {
  context?: Setup["eventContext"] | null;
  now?: Date;
};

const CRITICAL_WINDOW_MINUTES = 60;

export function buildEventModifier(params: BuildParams): EventModifier {
  const now = params.now ?? new Date();
  const ctx = params.context;
  const top = ctx?.topEvents?.[0];
  const eventCount = ctx?.eventCount ?? ctx?.topEvents?.length ?? 0;

  const missingFields: string[] = [];
  const minutesToEvent =
    typeof top?.timeToEventMinutes === "number"
      ? top.timeToEventMinutes
      : top?.scheduledAt
        ? Math.round((new Date(top.scheduledAt).getTime() - now.getTime()) / 60000)
        : undefined;

  if (top && !top.scheduledAt) missingFields.push("scheduledAt");
  if (top && !top.title) missingFields.push("title");

  let classification: EventModifier["classification"] = "none";
  if (eventCount > 0 && top) {
    const isCritical =
      (top.impact ?? 0) >= 3 &&
      typeof minutesToEvent === "number" &&
      minutesToEvent >= 0 &&
      minutesToEvent <= CRITICAL_WINDOW_MINUTES;
    classification = isCritical ? "execution_critical" : "awareness_only";
  }

  const primaryEvent = top
    ? {
        title: top.title,
        scheduledAt: top.scheduledAt,
        impact: top.impact,
        minutesToEvent,
        source: top.source,
        country: (top as { country?: string }).country,
        currency: (top as { currency?: string }).currency,
        category: top.category,
      }
    : undefined;

  const rationale: string[] = [];
  if (classification === "execution_critical" && minutesToEvent !== undefined) {
    rationale.push(`High impact in ${minutesToEvent}m`);
  } else if (classification === "awareness_only" && top?.title) {
    rationale.push(`Upcoming: ${shorten(top.title)}`);
  }
  if (ctx?.notes?.includes("clustered_events")) {
    rationale.push("Clustered events nearby");
  }

  const executionAdjustments: string[] = [];
  if (classification === "execution_critical") {
    executionAdjustments.push("delay_entry", "reduce_size");
  } else if (classification === "awareness_only") {
    executionAdjustments.push("monitor_volatility");
  }

  const quality: EventModifier["quality"] = {
    usedGlobalFallback: ctx?.notes?.some((n) => n === "hash_fallback" || n === "events_db_unavailable") ?? false,
    missingFields: missingFields.length ? missingFields : undefined,
  };

  return {
    classification,
    primaryEvent,
    rationale: rationale.length ? rationale.slice(0, 3) : undefined,
    executionAdjustments: executionAdjustments.slice(0, 4),
    quality,
  };
}

function shorten(value: string, max = 48): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}
