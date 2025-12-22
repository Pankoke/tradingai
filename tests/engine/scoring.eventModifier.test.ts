import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { SetupRings } from "@/src/lib/engine/rings";

describe("computeAggregatedConfidence with event modifier enabled", () => {
  const originalFlag = process.env.EVENT_MODIFIER_ENABLED;

  beforeEach(() => {
    process.env.EVENT_MODIFIER_ENABLED = "1";
  });

  afterEach(() => {
    process.env.EVENT_MODIFIER_ENABLED = originalFlag;
  });

  it("does not change confidence when eventScore changes", async () => {
    const { computeAggregatedConfidence } = await import("@/src/lib/engine/scoring");
    const baseRings: SetupRings = {
      trendScore: 60,
      eventScore: 10,
      biasScore: 65,
      sentimentScore: 55,
      orderflowScore: 50,
      confidenceScore: 60,
      event: 10,
      bias: 65,
      sentiment: 55,
      orderflow: 50,
      confidence: 60,
      meta: {
        trend: { quality: "live" },
        event: { quality: "live" },
        bias: { quality: "live" },
        sentiment: { quality: "live" },
        orderflow: { quality: "live" },
        confidence: { quality: "live" },
      },
    };

    const confA = computeAggregatedConfidence(70, baseRings);
    const confB = computeAggregatedConfidence(70, { ...baseRings, eventScore: 90, event: 90 });
    expect(confA).toBe(confB);
  });
});
