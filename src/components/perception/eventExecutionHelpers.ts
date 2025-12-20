import type { EventContextInsights, PrimaryEventCandidate } from "@/src/components/perception/eventContextInsights";

export function roundMinutesForTrader(minutes: number | null): number {
  if (!Number.isFinite(minutes ?? NaN)) {
    return 60;
  }
  const absMinutes = Math.abs(Math.round(minutes ?? 0));
  if (absMinutes <= 12) return 15;
  if (absMinutes <= 25) return 30;
  if (absMinutes <= 50) return 60;
  return 120;
}

export function deriveEventTimingHint(
  insights: EventContextInsights,
  primaryEvent: PrimaryEventCandidate | null,
  t: (key: string) => string,
): string | null {
  if (insights.hasFallback || insights.riskKey === "unknown") {
    return t("events.execution.unknown");
  }

  const minutes =
    typeof primaryEvent?.timeToEventMinutes === "number" &&
    Number.isFinite(primaryEvent.timeToEventMinutes)
      ? primaryEvent.timeToEventMinutes
      : null;

  if (insights.riskKey === "highSoon") {
    if (minutes !== null && minutes <= 0) {
      const absMinutes = Math.abs(minutes);
      if (absMinutes <= 15) {
        return t("events.execution.postEventJustReleased");
      }
      if (absMinutes <= 60) {
        return t("events.execution.postEventVolatility");
      }
      return null;
    }
    if (minutes !== null && minutes > 0) {
      const rounded = roundMinutesForTrader(minutes);
      const eventLabel =
        primaryEvent?.title && primaryEvent.title.trim().length > 0
          ? primaryEvent.title
          : t("events.execution.defaultEvent");
      return t("events.execution.highSoon")
        .replace("{minutes}", String(rounded))
        .replace("{event}", eventLabel);
    }
    return null;
  }

  if (insights.riskKey === "elevated") {
    return t("events.execution.elevated");
  }

  if (insights.riskKey === "calm") {
    return t("events.execution.calm");
  }

  return null;
}
