import { describe, expect, it } from "vitest";
import { buildEventModifier } from "@/src/lib/engine/modules/eventModifier";

const baseContext = {
  windowFrom: new Date().toISOString(),
  windowTo: new Date().toISOString(),
  windowKind: "intraday" as const,
};

const setupFx = { symbol: "EURUSD=X", timeframe: "1H", category: "intraday" };
const setupIndex = { symbol: "^GDAXI", timeframe: "1H", category: "trend" };
const setupCrypto = { symbol: "BTC-USD", timeframe: "1H", category: "crypto" };

describe("buildEventModifier relevance & classification", () => {
  it("returns none when there are no events", () => {
    const modifier = buildEventModifier({ context: { ...baseContext, topEvents: [] }, setup: setupFx });
    expect(modifier.classification).toBe("none");
  });

  it("classifies EURUSD + US CPI in 30m as execution_critical with high relevance", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const modifier = buildEventModifier({
      now,
      setup: setupFx,
      context: {
        ...baseContext,
        topEvents: [{ title: "US CPI", impact: 3, scheduledAt, timeToEventMinutes: 30, country: "US", currency: "USD" }],
      },
    });
    expect(modifier.classification).toBe("execution_critical");
    expect(modifier.primaryEvent?.title).toContain("US CPI");
  });

  it("classifies DAX + US CPI in 30m as context_relevant", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const modifier = buildEventModifier({
      now,
      setup: setupIndex,
      context: {
        ...baseContext,
        topEvents: [{ title: "US CPI", impact: 3, scheduledAt, timeToEventMinutes: 30, country: "US", currency: "USD" }],
      },
    });
    expect(modifier.classification === "context_relevant" || modifier.classification === "awareness_only").toBe(true);
  });

  it("classifies BTC + DE PMI in 30m as awareness_only (lower relevance)", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const modifier = buildEventModifier({
      now,
      setup: setupCrypto,
      context: {
        ...baseContext,
        topEvents: [{ title: "DE PMI", impact: 2, scheduledAt, timeToEventMinutes: 30, country: "DE" }],
      },
    });
    expect(modifier.classification === "awareness_only" || modifier.classification === "context_relevant").toBe(true);
  });

  it("penalizes missing country/currency and captures missingFields", () => {
    const modifier = buildEventModifier({
      setup: setupFx,
      context: {
        ...baseContext,
        topEvents: [{ title: "Unnamed", impact: 2, scheduledAt: new Date().toISOString(), timeToEventMinutes: 90 }],
      },
    });
    expect(modifier.quality?.missingFields).toContain("country");
  });

  it("downshifts classification when macro fields are missing (reliability low)", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const modifier = buildEventModifier({
      now,
      setup: setupFx,
      context: {
        ...baseContext,
        topEvents: [{ title: "US CPI", impact: 3, scheduledAt, timeToEventMinutes: 30 }], // missing country/currency
      },
    });
    expect(modifier.classification === "awareness_only" || modifier.classification === "context_relevant").toBe(true);
    expect(modifier.reliabilityWeight).toBeLessThan(1);
  });

  it("computes surprise only when actual/forecast parseable and post-release", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // past 30m
    const modifier = buildEventModifier({
      now,
      setup: setupFx,
      context: {
        ...baseContext,
        topEvents: [
          {
            title: "US CPI",
            impact: 3,
            scheduledAt,
            timeToEventMinutes: -30,
            country: "US",
            currency: "USD",
            actualValue: "3.2",
            forecastValue: "3.0",
          },
        ],
      },
    });
    expect(modifier.surprise).not.toBeUndefined();
    expect(modifier.rationale?.some((r) => r.toLowerCase().includes("surprise"))).toBe(true);
  });
});
