import type { SentimentContribution } from "@/src/lib/engine/sentimentMetrics";
import type { SentimentFlag, SentimentLabel } from "@/src/lib/engine/types";

export type SentimentSnapshot = {
  assetId: string;
  asOf: Date;
  score: number;
  label?: SentimentLabel;
  confidence?: number;
  contributions?: SentimentContribution[];
  flags?: SentimentFlag[];
  raw?: unknown;
};
