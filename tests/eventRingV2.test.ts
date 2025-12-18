import { describe, expect, it } from "vitest";
import { analyzeEventsForWindow, type EventRingWindow } from "@/src/lib/engine/modules/eventRingV2";
import type { Event } from "@/src/server/repositories/eventRepository";

function createEvent(overrides: Partial<Event>): Event {
  const now = new Date();
  return {
    id: overrides.id ?? `evt-${Math.random().toString(36).slice(2)}`,
    providerId: overrides.providerId ?? null,
    title: overrides.title ?? "Test Event",
    description: overrides.description ?? null,
    category: overrides.category ?? "macro",
    impact: overrides.impact ?? 2,
    country: overrides.country ?? null,
    summary: overrides.summary ?? null,
    marketScope: overrides.marketScope ?? null,
    expectationLabel: overrides.expectationLabel ?? null,
    expectationConfidence: overrides.expectationConfidence ?? null,
    expectationNote: overrides.expectationNote ?? null,
    enrichedAt: overrides.enrichedAt ?? null,
    scheduledAt: overrides.scheduledAt ?? now,
    actualValue: overrides.actualValue ?? null,
    previousValue: overrides.previousValue ?? null,
    forecastValue: overrides.forecastValue ?? null,
    affectedAssets: overrides.affectedAssets ?? [],
    source: overrides.source ?? "jb-news",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function buildWindow(now: Date): EventRingWindow {
  return {
    windowFrom: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    windowTo: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    windowKind: "daily",
  };
}

describe("eventRingV2 analyzeEventsForWindow", () => {
  it("returns deterministic fallback when no events exist", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const window = buildWindow(now);
    const result = analyzeEventsForWindow({ events: [], now, window });

    expect(result.score).toBe(45);
    expect(result.notes).toContain("no_relevant_events");
    expect(result.topEvents).toHaveLength(0);
  });

  it("boosts score and notes when a high impact event is imminent", () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const window = buildWindow(now);
    const highImpactSoon = createEvent({
      impact: 3,
      scheduledAt: new Date(now.getTime() + 30 * 60 * 1000),
      title: "High Impact",
    });

    const result = analyzeEventsForWindow({ events: [highImpactSoon], now, window });

    expect(result.score).toBeGreaterThan(50);
    expect(result.notes).toContain("high_impact_soon");
    expect(result.topEvents[0]?.title).toBe("High Impact");
  });

  it("flags clustered events and increases score density", () => {
    const now = new Date("2025-01-02T09:00:00Z");
    const window = buildWindow(now);
    const events = [
      createEvent({ scheduledAt: new Date(now.getTime() + 15 * 60 * 1000), impact: 2, title: "Event 1" }),
      createEvent({ scheduledAt: new Date(now.getTime() + 30 * 60 * 1000), impact: 2, title: "Event 2" }),
      createEvent({ scheduledAt: new Date(now.getTime() + 45 * 60 * 1000), impact: 1, title: "Event 3" }),
    ];

    const result = analyzeEventsForWindow({ events, now, window });

    expect(result.notes).toContain("clustered_events");
    expect(result.score).toBeGreaterThan(50);
    expect(result.eventCount).toBe(3);
  });
});
