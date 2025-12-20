import { describe, expect, it } from "vitest";

import { deriveEventTimingHint, roundMinutesForTrader } from "@/src/components/perception/eventExecutionHelpers";
import type { EventContextInsights, PrimaryEventCandidate } from "@/src/components/perception/eventContextInsights";

const translations: Record<string, string> = {
  "events.execution.highSoon": "Avoid within {minutes} minutes of {event}",
  "events.execution.postEventJustReleased": "Post just released",
  "events.execution.postEventVolatility": "Post volatility warning",
  "events.execution.elevated": "Clustered volatility ahead",
  "events.execution.calm": "Calm window",
  "events.execution.unknown": "Unknown timing",
  "events.execution.defaultEvent": "the release",
};

const t = (key: string): string => translations[key] ?? key;

describe("roundMinutesForTrader", () => {
  it("normalizes small values to readable buckets", () => {
    expect(roundMinutesForTrader(5)).toBe(15);
    expect(roundMinutesForTrader(18)).toBe(30);
    expect(roundMinutesForTrader(45)).toBe(60);
    expect(roundMinutesForTrader(99)).toBe(120);
    expect(roundMinutesForTrader(null)).toBe(60);
    expect(roundMinutesForTrader(-8)).toBe(15);
  });
});

describe("deriveEventTimingHint", () => {
  const highSoonInsights: EventContextInsights = {
    hasFallback: false,
    primaryNote: "high_impact_soon",
    riskKey: "highSoon",
  };

  const calmInsights: EventContextInsights = {
    hasFallback: false,
    primaryNote: "no_relevant_events",
    riskKey: "calm",
  };

  const fallbackInsights: EventContextInsights = {
    hasFallback: true,
    primaryNote: null,
    riskKey: "unknown",
  };

  it("returns a rounded avoidance message for upcoming events", () => {
    const primary: PrimaryEventCandidate = { title: "CPI", timeToEventMinutes: 8 };
    const hint = deriveEventTimingHint(highSoonInsights, primary, t);
    expect(hint).toContain("15");
    expect(hint).toContain("CPI");
  });

  it("handles just-released events", () => {
    const primary: PrimaryEventCandidate = { title: "CPI", timeToEventMinutes: -5 };
    const hint = deriveEventTimingHint(highSoonInsights, primary, t);
    expect(hint).toBe("Post just released");
  });

  it("handles recent post-event volatility", () => {
    const primary: PrimaryEventCandidate = { title: "CPI", timeToEventMinutes: -30 };
    const hint = deriveEventTimingHint(highSoonInsights, primary, t);
    expect(hint).toBe("Post volatility warning");
  });

  it("falls back to calm string for calm windows", () => {
    const hint = deriveEventTimingHint(calmInsights, null, t);
    expect(hint).toBe("Calm window");
  });

  it("shows unknown when fallback is in play", () => {
    const hint = deriveEventTimingHint(fallbackInsights, null, t);
    expect(hint).toBe("Unknown timing");
  });
});
