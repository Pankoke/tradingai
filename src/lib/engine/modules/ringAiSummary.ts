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

export function buildRingAiSummaryForSetup(params: SummaryInput): RingAiSummary {
  const { setup } = params;
  const dir = setup.direction ?? "Neutral";
  const asset = setup.symbol ?? setup.assetId ?? "asset";
  const timeframe = setup.timeframe ?? "timeframe";

  const buckets = {
    trend: bucketLabel(setup.rings.trendScore),
    event: bucketLabel(setup.rings.eventScore),
    bias: bucketLabel(setup.rings.biasScore),
    sentiment: bucketLabel(setup.rings.sentimentScore),
    orderflow: bucketLabel(setup.rings.orderflowScore),
    confidence: bucketLabel(setup.rings.confidenceScore ?? setup.confidence ?? 0),
  };
  const confidenceVal = Math.round(setup.rings.confidenceScore ?? setup.confidence ?? 0);

  const shortSummaryParts: string[] = [];
  shortSummaryParts.push(
    `${asset} ${dir} on ${timeframe}: ${buckets.trend} trend, ${buckets.bias} bias, ${buckets.orderflow} flow, ${buckets.event} event risk.`,
  );
  if (confidenceVal) {
    shortSummaryParts.push(`Confidence ${confidenceVal} (${buckets.confidence}).`);
  }
  const shortSummary = shortSummaryParts.join(" ");

  const driverCandidates: Array<{ name: string; score: number; bucket: "low" | "medium" | "high" }> = [
    { name: "Trend", score: Math.round(setup.rings.trendScore), bucket: buckets.trend },
    { name: "Bias", score: Math.round(setup.rings.biasScore), bucket: buckets.bias },
    { name: "Orderflow", score: Math.round(setup.rings.orderflowScore), bucket: buckets.orderflow },
    { name: "Sentiment", score: Math.round(setup.rings.sentimentScore), bucket: buckets.sentiment },
  ];
  const drivers = driverCandidates
    .filter((d) => d.bucket === "high")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const risks: string[] = [];
  if (buckets.event === "high") risks.push(`Event risk elevated (${Math.round(setup.rings.eventScore)})`);
  const rrr = params.setup.riskReward?.rrr;
  const riskPct = params.setup.riskReward?.riskPercent;
  const volLabel = params.setup.riskReward?.volatilityLabel;
  if (rrr !== null && rrr !== undefined && rrr < 1.5) risks.push(`Low RRR (${rrr.toFixed(2)})`);
  if (riskPct !== null && riskPct !== undefined && riskPct > 2.5) risks.push(`Elevated risk % (${riskPct.toFixed(2)}%)`);
  if (volLabel && volLabel.toLowerCase() === "high") risks.push("High volatility regime");

  const conflicts: string[] = [];
  if (buckets.trend === "high" && buckets.sentiment === "low") conflicts.push("Strong trend but weak sentiment");
  if (dir.toLowerCase() === "long" && buckets.event === "high") conflicts.push("Bullish bias vs. high event risk");
  if (drivers.length >= 2 && buckets.confidence !== "high") conflicts.push("Strong drivers but only medium/low confidence");

  const keyFacts: { label: string; value: string }[] = [];
  if (drivers.length) {
    const driverText = drivers.map((d) => `${d.name} ${d.bucket} (${d.score})`).join(", ");
    keyFacts.push({ label: "Driver", value: driverText });
  } else {
    keyFacts.push({ label: "Driver", value: `Trend ${buckets.trend} (${Math.round(setup.rings.trendScore)})` });
  }
  if (confidenceVal) keyFacts.push({ label: "Confidence", value: `${confidenceVal} (${buckets.confidence})` });
  if (risks.length) {
    keyFacts.push({ label: "Risk", value: risks.join("; ") });
  } else {
    keyFacts.push({ label: "Risk", value: `Event risk ${buckets.event} (${Math.round(setup.rings.eventScore)})` });
  }
  if (conflicts.length) {
    keyFacts.push({ label: "Conflict", value: conflicts.join("; ") });
  } else if (buckets.confidence === "low") {
    keyFacts.push({ label: "Conflict", value: "Low confidence despite available signals" });
  }

  if (params.setup.riskReward) {
    const { rrr: rrVal, riskPercent, rewardPercent, volatilityLabel } = params.setup.riskReward;
    if (rrVal !== null && rrVal !== undefined) keyFacts.push({ label: "RRR", value: rrVal.toFixed(2) });
    if (riskPercent !== null && rewardPercent !== null) {
      keyFacts.push({
        label: "Risk/Reward %",
        value: `Risk ${riskPercent ?? "n/a"}%, Reward ${rewardPercent ?? "n/a"}%`,
      });
    }
    if (volatilityLabel) keyFacts.push({ label: "Volatility", value: volatilityLabel });
  }

  const longParts: string[] = [];
  if (drivers.length) {
    longParts.push(`Drivers: ${drivers.map((d) => `${d.name.toLowerCase()} ${d.bucket} (${d.score})`).join(", ")}.`);
  } else {
    longParts.push(
      `Trend ${buckets.trend} (${Math.round(setup.rings.trendScore)}) and bias ${buckets.bias} (${Math.round(
        setup.rings.biasScore,
      )}) set the backdrop.`,
    );
  }
  if (risks.length) longParts.push(`Risks: ${risks.join("; ")}.`);
  if (conflicts.length) {
    longParts.push(`Conflicts: ${conflicts.join("; ")}.`);
  } else {
    longParts.push(`Confidence ${confidenceVal} (${buckets.confidence}); overall confluence is ${buckets.confidence}.`);
  }

  return {
    shortSummary,
    longSummary: longParts.join(" "),
    keyFacts,
  };
}
