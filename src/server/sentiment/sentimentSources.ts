import type { SentimentSourceRef } from "@/src/domain/sentiment/types";

export type SentimentSourceId = "primary";

export type SentimentSourceConfig = {
  sourceId: SentimentSourceId;
  enabled: boolean;
  weight: number;
  priority: number;
  maxAgeOkSec?: number;
  maxAgeDegradedSec?: number;
};

export const SENTIMENT_SOURCES: ReadonlyArray<SentimentSourceConfig> = [
  {
    sourceId: "primary",
    enabled: true,
    weight: 1,
    priority: 0,
    maxAgeOkSec: 6 * 60 * 60,
    maxAgeDegradedSec: 12 * 60 * 60,
  },
];

export type SentimentSourceValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateSentimentSources(configs: SentimentSourceConfig[]): SentimentSourceValidation {
  const errors: string[] = [];
  const enabled = configs.filter((c) => c.enabled);
  if (enabled.length === 0) {
    errors.push("At least one sentiment source must be enabled");
  }
  configs.forEach((cfg) => {
    if (cfg.weight < 0) {
      errors.push(`Source ${cfg.sourceId}: weight must be >= 0`);
    }
  });
  const priorities = new Set<number>();
  configs.forEach((cfg) => {
    if (priorities.has(cfg.priority)) {
      errors.push("Priorities must be unique to ensure deterministic ordering");
    } else {
      priorities.add(cfg.priority);
    }
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function pickPrimarySource(configs: SentimentSourceConfig[] = SENTIMENT_SOURCES): SentimentSourceConfig | null {
  const enabled = configs.filter((c) => c.enabled);
  if (!enabled.length) return null;
  return enabled.slice().sort((a, b) => a.priority - b.priority)[0];
}

export function toSourceRef(config: SentimentSourceConfig, updatedAtIso: string): SentimentSourceRef {
  return {
    sourceId: config.sourceId,
    weight: config.weight,
    updatedAtIso,
  };
}
