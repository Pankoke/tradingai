import { describe, expect, it } from "vitest";
import { resolveConsensusSnapshot } from "@/src/server/events/eventConsensus";

describe("resolveConsensusSnapshot", () => {
  it("returns null when forecast missing", () => {
    expect(resolveConsensusSnapshot({ forecast: null, previous: "1.0", intlLocale: "en-US" })).toBeNull();
  });

  it("returns consensus row without delta when parsing fails", () => {
    const snapshot = resolveConsensusSnapshot({
      forecast: "120K",
      previous: "110K",
      intlLocale: "en-US",
    });
    expect(snapshot).toEqual({
      forecast: "120K",
      previous: "110K",
      delta: undefined,
    });
  });

  it("computes percentage deltas in pp", () => {
    const snapshot = resolveConsensusSnapshot({
      forecast: "3.2%",
      previous: "3.0%",
      intlLocale: "en-US",
    });
    expect(snapshot?.delta).toBe("+0.2pp");
  });

  it("computes numeric deltas with locale formatting", () => {
    const snapshot = resolveConsensusSnapshot({
      forecast: "250.5",
      previous: "248.0",
      intlLocale: "de-DE",
    });
    expect(snapshot?.delta).toBe("+2,5");
  });
});
