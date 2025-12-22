import { describe, expect, it } from "vitest";
import { buildEventModifier } from "@/src/lib/engine/modules/eventModifier";

const baseContext = {
  windowFrom: new Date().toISOString(),
  windowTo: new Date().toISOString(),
  windowKind: "intraday",
};

describe("buildEventModifier", () => {
  it("returns classification none when there are no events", () => {
    const modifier = buildEventModifier({ context: { ...baseContext, topEvents: [] } });
    expect(modifier.classification).toBe("none");
    expect(modifier.primaryEvent).toBeUndefined();
  });

  it("marks execution_critical when a high-impact event is within 60 minutes", () => {
    const now = new Date("2025-01-01T10:00:00.000Z");
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const modifier = buildEventModifier({
      now,
      context: {
        ...baseContext,
        topEvents: [
          {
            title: "CPI Release",
            impact: 3,
            scheduledAt,
            timeToEventMinutes: 30,
            source: "jb-news",
          },
        ],
      },
    });
    expect(modifier.classification).toBe("execution_critical");
    expect(modifier.primaryEvent?.title).toBe("CPI Release");
    expect(modifier.executionAdjustments).toContain("delay_entry");
  });
});
