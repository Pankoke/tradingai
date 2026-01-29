import { describe, expect, it } from "vitest";
import { analyzeEventsForWindow, computeEventRingV2, resolveEventRingWindow } from "@/src/lib/engine/modules/eventRingV2";
import type { EventRow } from "@/src/domain/events/types";
import type { Setup } from "@/src/lib/engine/types";

const baseSetup: Setup = {
  id: "s1",
  assetId: "asset-1",
  symbol: "AAA",
  timeframe: "1D",
  direction: "Long",
  confidence: 70,
  eventScore: 0,
  biasScore: 50,
  sentimentScore: 50,
  balanceScore: 50,
  type: "Regelbasiert",
  accessLevel: "free",
  rings: {
    trendScore: 50,
    orderflowScore: 50,
    sentimentScore: 50,
    biasScore: 50,
    confidenceScore: 50,
    orderflow: 50,
    sentiment: 50,
    eventScore: 0,
    balanceScore: 50,
  },
};

describe("eventRingV2 pure functions", () => {
  it("computes window deterministically from asOf", async () => {
    const asOf = new Date("2026-01-01T12:00:00Z");
    const window = resolveEventRingWindow(baseSetup, asOf);
    expect(window.windowFrom.getTime()).toBeLessThan(asOf.getTime());
    expect(window.windowTo.getTime()).toBeGreaterThan(asOf.getTime());
  });

  it("analyzes events passed in without server access", async () => {
    const asOf = new Date("2026-01-01T12:00:00Z");
    const window = resolveEventRingWindow(baseSetup, asOf);
    const events: EventRow[] = [
      {
        id: "e1",
        providerId: "p1",
        title: "CPI Release",
        description: null,
        category: "macro",
        impact: 3,
        country: "US",
        summary: null,
        marketScope: null,
        expectationLabel: null,
        expectationConfidence: null,
        expectationNote: null,
        enrichedAt: null,
        scheduledAt: new Date(asOf.getTime() + 30 * 60 * 1000),
        actualValue: null,
        previousValue: null,
        forecastValue: null,
        affectedAssets: [],
        source: "test",
        createdAt: asOf,
        updatedAt: asOf,
      },
    ];

    const result = await computeEventRingV2({ setup: baseSetup, now: asOf, events });
    expect(result.context.eventCountInWindow).toBe(1);
    expect(result.context.topEvents[0]?.title).toBe("CPI Release");

    const pure = analyzeEventsForWindow({ events, now: asOf, window });
    expect(pure.eventCount).toBe(1);
  });
});
