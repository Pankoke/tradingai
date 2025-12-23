import { describe, expect, it } from "vitest";
import { buildRingDefinitions, mapEventRisk } from "@/src/features/perception/ui/PerceptionTodayPanel";

const t = (key: string) => key;

describe("PerceptionTodayPanel helpers", () => {
  it("filters out event ring when modifier is enabled", () => {
    const defs = buildRingDefinitions(true, t);
    const keys = defs.map((d) => d.key);
    expect(keys).not.toContain("eventScore");
    expect(keys).toContain("trendScore");
  });

  it("keeps event ring when modifier is disabled", () => {
    const defs = buildRingDefinitions(false, t);
    const keys = defs.map((d) => d.key);
    expect(keys).toContain("eventScore");
  });

  it("maps event risk from modifier classification", () => {
    expect(mapEventRisk("execution_critical")).toBe("high");
    expect(mapEventRisk("context_relevant")).toBe("medium");
    expect(mapEventRisk("awareness_only")).toBe("low");
    expect(mapEventRisk("none")).toBe("low");
  });
});
