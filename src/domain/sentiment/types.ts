/**
 * Sentiment V2 domain contract (server-free).
 * All timestamps are ISO strings to stay JSON/DB friendly.
 */
export type SentimentWindow = {
  fromIso: string;
  toIso: string;
  granularity?: "1H" | "1D";
};

export type SentimentSourceRef = {
  sourceId: string;
  updatedAtIso?: string;
  weight?: number;
};

/**
 * Components use normalized score ranges:
 * - polarityScore, momentumScore in [-1, 1] (unitless sentiment direction/intensity)
 * - confidence in [0, 1]
 * - volume is optional, non-negative
 */
export type SentimentComponents = {
  polarityScore?: number;
  momentumScore?: number;
  confidence?: number;
  volume?: number;
  biasScore?: number;
  trendScore?: number;
  orderflowScore?: number;
  eventScore?: number;
  rrr?: number;
  riskPercent?: number;
  volatilityLabel?: string;
  driftPct?: number;
};

export type SentimentSnapshotV2 = {
  assetId: string;
  asOfIso: string;
  window: SentimentWindow;
  sources: SentimentSourceRef[];
  components: SentimentComponents;
  raw?: unknown;
  meta?: Record<string, string | number | boolean | null>;
};

// Backward-compatible alias for existing imports
export type SentimentSnapshot = SentimentSnapshotV2;
