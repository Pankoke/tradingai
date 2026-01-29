import type { SentimentContribution } from "@/src/lib/engine/sentimentMetrics";
import type { SentimentFlag, SentimentLabel } from "@/src/lib/engine/types";
import type { SentimentRawSnapshot } from "@/src/server/sentiment/SentimentProvider";

export type SentimentSnapshot = {
  assetId: string;
  asOf: Date;
  score: number;
  label?: SentimentLabel;
  confidence?: number;
  contributions?: SentimentContribution[];
  flags?: SentimentFlag[];
  raw?: SentimentRawSnapshot | null;
};
