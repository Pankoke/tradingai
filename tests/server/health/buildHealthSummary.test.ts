import { describe, expect, it } from "vitest";
import { buildHealthSummary } from "@/src/server/health/buildHealthSummary";

const now = new Date("2026-01-01T00:00:00Z");

describe("buildHealthSummary", () => {
  it("maps provider stats into health results with statuses and freshness", async () => {
    const results = await buildHealthSummary({
      now,
      windowHours: 24,
      deps: {
        getProviderCandleStats: async () => [
          { source: "provider", timeframe: "1H", lastTimestamp: new Date("2025-12-31T23:00:00Z"), sampleCount: 10 },
        ],
        getAssetCandleStats: async () => [
          { assetId: "A", source: "derived", timeframe: "4H", lastTimestamp: new Date("2025-12-31T20:00:00Z") },
        ],
        getEventEnrichmentStats: async () => ({
          total: 5,
          enriched: 4,
          fallbackOnly: 1,
          candidates: 2,
          lastEnrichedAt: new Date("2025-12-31T22:00:00Z"),
        }),
      },
    });

    const market = results.find((r) => r.key === "marketdata");
    expect(market?.status).toBe("ok");
    expect(market?.freshness?.latestTimestamp).toBe("2025-12-31T23:00:00.000Z");

    const derived = results.find((r) => r.key === "derived");
    expect(derived?.status).toBe("ok");
    expect(derived?.freshness?.latestTimestamp).toBe("2025-12-31T20:00:00.000Z");

    const events = results.find((r) => r.key === "events");
    expect(events?.counts?.total).toBe(5);
    expect(events?.status).toBe("ok");

    const sentiment = results.find((r) => r.key === "sentiment");
    expect(sentiment?.status).toBe("degraded");
    expect(sentiment?.warnings).toContain("sentiment_stats_unavailable");
  });
});
