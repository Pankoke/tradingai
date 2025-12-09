import type { Setup } from "@/src/lib/engine/types";

export type SentimentScoreResult = {
  sentimentScore: number;
};

function hashSymbolTimeframe(setup: Setup): number {
  const key = `${setup.symbol}-${setup.timeframe}`;
  return key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function applySentimentScoring(setup: Setup): SentimentScoreResult {
  if (typeof setup.sentiment?.score === "number") {
    return {
      sentimentScore: Math.min(100, Math.max(0, Math.round(setup.sentiment.score))),
    };
  }

  if (typeof setup.sentimentScore === "number") {
    return {
      sentimentScore: Math.min(100, Math.max(0, Math.round(setup.sentimentScore))),
    };
  }

  const hash = hashSymbolTimeframe(setup);
  const base = 20 + (hash % 61);
  return { sentimentScore: Math.min(100, Math.max(0, base)) };
}
