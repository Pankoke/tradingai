import { describe, it, expect } from "vitest";
import { summarizeRingMeta } from "@/src/components/perception/RingGauges";

describe("summarizeRingMeta", () => {
  it("returns badge info for heuristic quality", () => {
    const summary = summarizeRingMeta({
      quality: "heuristic",
      timeframe: "unknown",
      notes: ["hash_fallback"],
    });
    expect(summary).not.toBeNull();
    expect(summary?.label).toBe("HEUR");
    expect(summary?.lines.join(" ")).toMatch(/hash/i);
  });
});
