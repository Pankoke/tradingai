import { describe, expect, it } from "vitest";

import {
  SENTIMENT_SOURCES,
  pickPrimarySource,
  toSourceRef,
  validateSentimentSources,
  type SentimentSourceConfig,
} from "@/src/server/sentiment/sentimentSources";

describe("sentimentSources registry", () => {
  it("accepts the default config", () => {
    const result = validateSentimentSources([...SENTIMENT_SOURCES]);
    expect(result.ok).toBe(true);
  });

  it("fails when no source is enabled", () => {
    const disabled: SentimentSourceConfig[] = [{ ...SENTIMENT_SOURCES[0], enabled: false }];
    const result = validateSentimentSources(disabled);
    expect(result.ok).toBe(false);
  });

  it("pickPrimarySource returns the highest-priority enabled source", () => {
    const cfg: SentimentSourceConfig[] = [
      { ...SENTIMENT_SOURCES[0], sourceId: "primary", priority: 2 },
      { ...SENTIMENT_SOURCES[0], sourceId: "primary", priority: 0, enabled: true },
    ];
    const primary = pickPrimarySource(cfg);
    expect(primary?.priority).toBe(0);
  });

  it("toSourceRef maps config to domain source ref", () => {
    const cfg = SENTIMENT_SOURCES[0];
    const ref = toSourceRef(cfg, "2025-01-01T00:00:00.000Z");
    expect(ref.sourceId).toBe(cfg.sourceId);
    expect(ref.weight).toBe(cfg.weight);
    expect(ref.updatedAtIso).toBe("2025-01-01T00:00:00.000Z");
  });
});
