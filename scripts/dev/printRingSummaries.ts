import { buildRingAiSummaryForSetup } from "../src/lib/engine/modules/ringAiSummary";
import { maybeEnhanceRingAiSummaryWithLLM } from "../src/server/ai/ringSummaryOpenAi";
import type { RiskRewardSummary, Setup } from "../src/lib/engine/types";

type CaseInput = {
  name: string;
  assetId: string;
  symbol: string;
  direction: "Long" | "Short" | "Neutral";
  timeframe: string;
  trendScore: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  orderflowScore: number;
  confidenceScore: number;
  rrr: number;
  riskPercent: number;
  rewardPercent: number;
  volatilityLabel: RiskRewardSummary["volatilityLabel"];
};

function makeSetup(input: CaseInput): Setup {
  const rings = {
    trendScore: input.trendScore,
    eventScore: input.eventScore,
    biasScore: input.biasScore,
    sentimentScore: input.sentimentScore,
    orderflowScore: input.orderflowScore,
    confidenceScore: input.confidenceScore,
    event: input.eventScore,
    bias: input.biasScore,
    sentiment: input.sentimentScore,
    orderflow: input.orderflowScore,
    confidence: input.confidenceScore,
  };

  return {
    id: input.name.toLowerCase().replace(/\s+/g, "-"),
    assetId: input.assetId,
    symbol: input.symbol,
    timeframe: input.timeframe,
    direction: input.direction,
    confidence: input.confidenceScore,
    eventScore: input.eventScore,
    biasScore: input.biasScore,
    sentimentScore: input.sentimentScore,
    balanceScore: 50,
    entryZone: null,
    stopLoss: null,
    takeProfit: null,
    category: undefined,
    levelDebug: undefined,
    type: "Regelbasiert",
    accessLevel: "free",
    rings,
    riskReward: {
      riskPercent: input.riskPercent,
      rewardPercent: input.rewardPercent,
      rrr: input.rrr,
      volatilityLabel: input.volatilityLabel,
    },
    snapshotId: null,
    snapshotCreatedAt: null,
    eventContext: null,
    ringAiSummary: null,
  };
}

async function run(): Promise<void> {
  const cases: CaseInput[] = [
    {
      name: "Case A - Gold strong drivers neutral flow",
      assetId: "gold",
      symbol: "GC=F",
      direction: "Long",
      timeframe: "1D",
      trendScore: 78,
      biasScore: 88,
      sentimentScore: 58,
      orderflowScore: 40,
      eventScore: 38,
      confidenceScore: 70,
      rrr: 4.8,
      riskPercent: 1.0,
      rewardPercent: 4.5,
      volatilityLabel: "medium",
    },
    {
      name: "Case B - WTI short strong drivers weak flow",
      assetId: "wti",
      symbol: "WTI",
      direction: "Short",
      timeframe: "1D",
      trendScore: 78,
      biasScore: 67,
      sentimentScore: 50,
      orderflowScore: 25,
      eventScore: 40,
      confidenceScore: 60,
      rrr: 5.0,
      riskPercent: 1.0,
      rewardPercent: 5.0,
      volatilityLabel: "medium",
    },
    {
      name: "Case C - Macro event driven",
      assetId: "eurusd",
      symbol: "EURUSD",
      direction: "Long",
      timeframe: "1D",
      trendScore: 55,
      biasScore: 55,
      sentimentScore: 60,
      orderflowScore: 55,
      eventScore: 82,
      confidenceScore: 60,
      rrr: 2.3,
      riskPercent: 1.8,
      rewardPercent: 3.5,
      volatilityLabel: "medium",
    },
    {
      name: "Case D - Flow driven weak structure",
      assetId: "btc",
      symbol: "BTCUSD",
      direction: "Long",
      timeframe: "4H",
      trendScore: 35,
      biasScore: 35,
      sentimentScore: 72,
      orderflowScore: 85,
      eventScore: 20,
      confidenceScore: 60,
      rrr: 2.2,
      riskPercent: 2.5,
      rewardPercent: 4.5,
      volatilityLabel: "medium",
    },
    {
      name: "Case E - No clear edge",
      assetId: "spx",
      symbol: "SPX",
      direction: "Long",
      timeframe: "1D",
      trendScore: 50,
      biasScore: 50,
      sentimentScore: 50,
      orderflowScore: 50,
      eventScore: 50,
      confidenceScore: 50,
      rrr: 1.8,
      riskPercent: 1.7,
      rewardPercent: 3.0,
      volatilityLabel: "medium",
    },
    {
      name: "Case F - Strong drivers low confidence",
      assetId: "ndx",
      symbol: "^NDX",
      direction: "Long",
      timeframe: "1D",
      trendScore: 75,
      biasScore: 75,
      sentimentScore: 65,
      orderflowScore: 65,
      eventScore: 28,
      confidenceScore: 40,
      rrr: 3.0,
      riskPercent: 1.5,
      rewardPercent: 4.5,
      volatilityLabel: "low",
    },
  ];

  for (const c of cases) {
    const setup = makeSetup(c);
    const heuristic = buildRingAiSummaryForSetup({
      setup: { ...setup, rings: setup.rings, confidence: setup.confidence, riskReward: setup.riskReward, ringAiSummary: null },
    });
    const enhanced = await maybeEnhanceRingAiSummaryWithLLM({
      setup: { ...setup, rings: setup.rings, riskReward: setup.riskReward },
      heuristic,
    });

    const headline = enhanced.shortSummary;
    const longPreview = enhanced.longSummary.split(". ").slice(0, 2).join(". ");

    console.log("====", c.name, "====");
    console.log("Scores", {
      trend: c.trendScore,
      bias: c.biasScore,
      event: c.eventScore,
      sentiment: c.sentimentScore,
      flow: c.orderflowScore,
      confidence: c.confidenceScore,
    });
    console.log("Source", enhanced.source ?? "heuristic");
    console.log("Short", headline);
    console.log("Long (preview)", longPreview);
    console.log("KeyFacts", enhanced.keyFacts);
    console.log("");
  }

  console.log("// Review: adjust prompts later if some cases sound off (e.g., Case E too bullish).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
