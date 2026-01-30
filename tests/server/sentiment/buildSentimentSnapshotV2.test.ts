import { describe, expect, it } from "vitest";

import { buildSentimentSnapshotV2 } from "@/src/server/sentiment/buildSentimentSnapshotV2";
import type { SentimentSourceConfig } from "@/src/server/sentiment/sentimentSources";

const baseSources: SentimentSourceConfig[] = [
  { sourceId: "primary", enabled: true, weight: 1, priority: 0 },
  { sourceId: "secondary", enabled: true, weight: 2, priority: 1 },
];

const asOf = new Date("2025-01-02T00:00:00.000Z");

function makeRaw(bias: number) {
  return {
    assetId: "btc",
    timestamp: "2025-01-02T00:00:00.000Z",
    biasScore: bias,
  };
}

describe("buildSentimentSnapshotV2", () => {
  it("merges two sources with weights", async () => {
    const result = await buildSentimentSnapshotV2({
      assetId: "btc",
      asOf,
      lookbackHours: 24,
      sources: baseSources,
      fetchRawBySource: async (sourceId) => (sourceId === "primary" ? makeRaw(100) : makeRaw(50)),
    });

    expect(result.snapshot.components.biasScore).toBeCloseTo((100 * 1 + 50 * 2) / 3);
    expect(result.snapshot.sources).toHaveLength(2);
    expect(result.warnings.length).toBe(0);
  });

  it("skips failing source and uses remaining", async () => {
    const result = await buildSentimentSnapshotV2({
      assetId: "btc",
      asOf,
      lookbackHours: 24,
      sources: baseSources,
      fetchRawBySource: async (sourceId) => {
        if (sourceId === "primary") throw new Error("fail");
        return makeRaw(70);
      },
    });

    expect(result.snapshot.components.biasScore).toBe(70);
    expect(result.snapshot.sources).toHaveLength(1);
    expect(Object.keys(result.perSource)).toContain("primary");
  });

  it("returns fallback when all fail", async () => {
    const result = await buildSentimentSnapshotV2({
      assetId: "btc",
      asOf,
      lookbackHours: 24,
      sources: baseSources,
      fetchRawBySource: async () => {
        throw new Error("fail-all");
      },
    });

    expect(result.snapshot.components.polarityScore).toBe(0);
    expect(result.snapshot.components.confidence).toBe(0);
    expect(result.snapshot.meta?.warnings).toBe("all sources failed");
  });
});
