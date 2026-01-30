import { describe, expect, it } from "vitest";
import { normalizeSentimentRawToSnapshot } from "@/src/domain/sentiment/normalizeSentiment";
import type { SentimentWindow } from "@/src/domain/sentiment/types";

const asOfIso = "2024-01-02T12:00:00.000Z";
const window: SentimentWindow = {
  fromIso: "2024-01-01T12:00:00.000Z",
  toIso: asOfIso,
  granularity: "1H",
};

describe("normalizeSentimentRawToSnapshot", () => {
  it("maps full raw input deterministically", () => {
    const raw = {
      sourceId: "providerA",
      updatedAt: "2024-01-02T11:59:00Z",
      polarityScore: 0.8,
      momentumScore: -1.2, // will be clamped to -1
      confidence: 1.2, // clamped to 1
      volume: 1000,
      meta: { note: "sample", debug: true },
    };

    const { snapshot, warnings } = normalizeSentimentRawToSnapshot(raw, {
      assetId: "BTC",
      asOfIso,
      window,
    });

    expect(warnings).toHaveLength(0);
    expect(snapshot.assetId).toBe("BTC");
    expect(snapshot.asOfIso).toBe(asOfIso);
    expect(snapshot.sources[0]).toMatchObject({ sourceId: "providerA", updatedAtIso: "2024-01-02T11:59:00.000Z" });
    expect(snapshot.components.polarityScore).toBeCloseTo(0.8);
    expect(snapshot.components.momentumScore).toBeCloseTo(-1);
    expect(snapshot.components.confidence).toBe(1);
    expect(snapshot.components.volume).toBe(1000);
    expect(snapshot.meta).toMatchObject({ note: "sample", debug: true });
  });

  it("adds warnings and defaults when fields are missing", () => {
    const raw = {};
    const { snapshot, warnings } = normalizeSentimentRawToSnapshot(raw, { assetId: "ETH", asOfIso, window });

    expect(warnings).toContain("missing_polarityScore");
    expect(warnings).toContain("missing_source");
    expect(snapshot.sources).toHaveLength(0);
    expect(snapshot.components.polarityScore).toBeUndefined();
  });

  it("skips invalid timestamps with warning", () => {
    const raw = {
      source: "providerB",
      updatedAt: "not-a-date",
      polarityScore: 0.1,
    };
    const { snapshot, warnings } = normalizeSentimentRawToSnapshot(raw, { assetId: "ETH", asOfIso, window });

    expect(warnings).not.toContain("missing_polarityScore");
    expect(snapshot.sources[0].updatedAtIso).toBeUndefined();
  });
});
