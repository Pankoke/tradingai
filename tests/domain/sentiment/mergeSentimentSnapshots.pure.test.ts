import { describe, expect, it } from "vitest";

import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";
import { mergeSentimentSnapshots } from "@/src/domain/sentiment/mergeSentimentSnapshots";

const baseWindow = {
  fromIso: "2025-01-01T00:00:00.000Z",
  toIso: "2025-01-02T00:00:00.000Z",
};

function snapshot(partial: Partial<SentimentSnapshotV2>): SentimentSnapshotV2 {
  return {
    assetId: partial.assetId ?? "btc",
    asOfIso: baseWindow.toIso,
    window: baseWindow,
    sources: partial.sources ?? [],
    components: { ...(partial.components ?? {}) },
    meta: partial.meta ?? {},
  };
}

describe("mergeSentimentSnapshots", () => {
  it("weighted averages numeric fields and keeps highest-weight label", () => {
    const result = mergeSentimentSnapshots(
      [
        { snapshot: snapshot({ components: { biasScore: 100, volatilityLabel: "low" } }), sourceId: "s1", weight: 1 },
        { snapshot: snapshot({ components: { biasScore: 50, volatilityLabel: "high" } }), sourceId: "s2", weight: 3 },
      ],
      { assetId: "btc", asOfIso: baseWindow.toIso, window: baseWindow },
    );

    // weighted avg = (100*1 + 50*3) / 4 = 62.5 => clampScore keeps 62.5
    expect(result.combined.components.biasScore).toBeCloseTo(62.5);
    expect(result.combined.components.volatilityLabel).toBe("high"); // highest weight wins
    expect(result.warnings.length).toBe(0);
  });

  it("skips missing fields in a source", () => {
    const result = mergeSentimentSnapshots(
      [
        { snapshot: snapshot({ components: { trendScore: 80 } }), sourceId: "s1", weight: 1 },
        { snapshot: snapshot({ components: {} }), sourceId: "s2", weight: 2 },
      ],
      { assetId: "btc", asOfIso: baseWindow.toIso, window: baseWindow },
    );

    expect(result.combined.components.trendScore).toBe(80);
  });

  it("skips assetId mismatch with warning", () => {
    const result = mergeSentimentSnapshots(
      [
        { snapshot: snapshot({ assetId: "eth", components: { biasScore: 90 } }), sourceId: "s1", weight: 1 },
        { snapshot: snapshot({ components: { biasScore: 70 } }), sourceId: "s2", weight: 1 },
      ],
      { assetId: "btc", asOfIso: baseWindow.toIso, window: baseWindow },
    );

    expect(result.combined.components.biasScore).toBe(70); // only matching asset used
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("label selection ties use first by weight ordering", () => {
    const result = mergeSentimentSnapshots(
      [
        { snapshot: snapshot({ components: { volatilityLabel: "low" } }), sourceId: "s1", weight: 2 },
        { snapshot: snapshot({ components: { volatilityLabel: "high" } }), sourceId: "s2", weight: 2 },
      ],
      { assetId: "btc", asOfIso: baseWindow.toIso, window: baseWindow },
    );

    expect(result.combined.components.volatilityLabel).toBe("low");
  });
});
