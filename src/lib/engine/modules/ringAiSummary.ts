import type { RingAiSummary, RiskRewardSummary, Setup } from "@/src/lib/engine/types";

type SummaryInput = {
  setup: Pick<
    Setup,
    | "assetId"
    | "symbol"
    | "timeframe"
    | "direction"
    | "eventScore"
    | "biasScore"
    | "sentimentScore"
    | "balanceScore"
    | "rings"
    | "confidence"
    | "ringAiSummary"
  > & { riskReward?: RiskRewardSummary | null };
};

function bucketLabel(score: number): "low" | "medium" | "high" {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function describeScore(name: string, score: number): string {
  const bucket = bucketLabel(score);
  if (bucket === "high") return `${name}: ${score} (high)`;
  if (bucket === "medium") return `${name}: ${score} (medium)`;
  return `${name}: ${score} (low)`;
}

export function buildRingAiSummaryForSetup(params: SummaryInput): RingAiSummary {
  const { setup } = params;
  const dir = setup.direction ?? "Neutral";
  const asset = setup.symbol ?? setup.assetId ?? "asset";
  const timeframe = setup.timeframe ?? "timeframe";

  const shortSummary = [
    `${asset} ${dir} on ${timeframe}:`,
    `Trend ${bucketLabel(setup.rings.trendScore)},`,
    `Bias ${bucketLabel(setup.rings.biasScore)},`,
    `Orderflow ${bucketLabel(setup.rings.orderflowScore)},`,
    `Events ${bucketLabel(setup.rings.eventScore)},`,
    `Sentiment ${bucketLabel(setup.rings.sentimentScore)},`,
    `Confidence ${Math.round(setup.rings.confidenceScore ?? setup.confidence)}%.`,
  ].join(" ");

  const longParts: string[] = [];
  longParts.push(
    `Trend at ${Math.round(setup.rings.trendScore)}% and bias at ${Math.round(setup.rings.biasScore)}% set a ${
      dir.toLowerCase() === "long" ? "bullish" : dir.toLowerCase() === "short" ? "bearish" : "neutral"
    } backdrop for ${asset} (${timeframe}).`,
  );
  longParts.push(
    `Orderflow sits at ${Math.round(setup.rings.orderflowScore)}%, signaling ${
      bucketLabel(setup.rings.orderflowScore) === "high" ? "strong positioning" : "moderate participation"
    }.`,
  );
  longParts.push(
    `Events are ${bucketLabel(setup.rings.eventScore)} (${Math.round(setup.rings.eventScore)}%), so headline risk is ${
      bucketLabel(setup.rings.eventScore) === "high" ? "elevated" : "contained"
    }. Sentiment is ${bucketLabel(setup.rings.sentimentScore)} (${Math.round(setup.rings.sentimentScore)}%).`,
  );
  const confidenceVal = Math.round(setup.rings.confidenceScore ?? setup.confidence ?? 0);
  longParts.push(`Confidence lands at ${confidenceVal}%, indicating ${confidenceVal >= 67 ? "strong" : confidenceVal >= 34 ? "moderate" : "low"} conviction.`);

  const keyFacts = [
    { label: "Trend", value: describeScore("Trend", Math.round(setup.rings.trendScore)) },
    { label: "Event", value: describeScore("Event", Math.round(setup.rings.eventScore)) },
    { label: "Bias", value: describeScore("Bias", Math.round(setup.rings.biasScore)) },
    { label: "Sentiment", value: describeScore("Sentiment", Math.round(setup.rings.sentimentScore)) },
    { label: "Orderflow", value: describeScore("Orderflow", Math.round(setup.rings.orderflowScore)) },
    { label: "Confidence", value: `${confidenceVal} (setup confidence)` },
  ];

  if (params.setup.riskReward) {
    const { rrr, riskPercent, rewardPercent, volatilityLabel } = params.setup.riskReward;
    const rrLabel = rrr ? rrr.toFixed(2) : "n/a";
    keyFacts.push({ label: "RRR", value: `${rrLabel} (risk/reward)` });
    if (riskPercent !== null && rewardPercent !== null) {
      keyFacts.push({
        label: "Risk/Reward %",
        value: `Risk ${riskPercent ?? "n/a"}%, Reward ${rewardPercent ?? "n/a"}%`,
      });
    }
    if (volatilityLabel) {
      keyFacts.push({ label: "Volatility regime", value: volatilityLabel });
    }
  }

  return {
    shortSummary,
    longSummary: longParts.join(" "),
    keyFacts,
  };
}
