import {
  Direction as SetupDirection,
  FormState,
  GeneratedSetup,
  RiskProfile,
  Timeframe,
} from "@/src/features/setup-generator/types";

export async function generateSetupFromMockEngine(
  form: FormState,
): Promise<GeneratedSetup> {
  const basePrice = mockBasePrice(form.asset);
  const direction: SetupDirection =
    form.directionMode === "auto" ? mockDirection() : form.directionMode;
  const volatilityLabel = mockVolatilityLabel();
  const entryWidthFactor =
    volatilityLabel === "high" ? 0.015 : volatilityLabel === "medium" ? 0.01 : 0.006;
  const entryCenter = basePrice * (1 + (direction === "long" ? -0.003 : 0.003));
  const entryMin = entryCenter * (1 - entryWidthFactor);
  const entryMax = entryCenter * (1 + entryWidthFactor);

  const stopDistanceFactor =
    volatilityLabel === "high" ? 0.025 : volatilityLabel === "medium" ? 0.018 : 0.012;
  const stopLoss =
    direction === "long" ? entryMin * (1 - stopDistanceFactor) : entryMax * (1 + stopDistanceFactor);

  const rrr = mockRrr(form.riskProfile);
  const riskPct = mockRiskPct(form.riskProfile);
  const potentialPct = riskPct * rrr;

  const takeProfit1 =
    direction === "long"
      ? entryMax * (1 + potentialPct * 0.6)
      : entryMin * (1 - potentialPct * 0.6);
  const takeProfit2 =
    direction === "long"
      ? entryMax * (1 + potentialPct)
      : entryMin * (1 - potentialPct);

  const confidence = randomInRange(0.55, 0.9);
  const biasScore = randomInRange(50, 85);
  const sentimentScore = randomInRange(40, 80);
  const eventScore = randomInRange(20, 80);
  const balanceScore = randomInRange(30, 80);

  const validUntil = new Date(Date.now() + mockValidForMs(form.timeframe));

  return {
    id: `mock-${Date.now()}`,
    asset: form.asset,
    timeframe: form.timeframe,
    direction,
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskReward: rrr,
    riskPct,
    potentialPct,
    volatilityLabel,
    confidence,
    biasScore,
    sentimentScore,
    eventScore,
    balanceScore,
    validUntil,
    contextSummary: buildContextSummary({
      timeframe: form.timeframe,
      direction,
      biasScore,
      sentimentScore,
      volatilityLabel,
    }),
  };
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mockBasePrice(asset: string): number {
  switch (asset) {
    case "BTCUSDT":
      return randomInRange(60000, 70000);
    case "ETHUSDT":
      return randomInRange(3000, 4500);
    case "SOLUSDT":
      return randomInRange(120, 220);
    case "XRPUSDT":
      return randomInRange(0.5, 1.2);
    default:
      return randomInRange(100, 1000);
  }
}

function mockDirection(): SetupDirection {
  return Math.random() > 0.5 ? "long" : "short";
}

function mockVolatilityLabel(): "low" | "medium" | "high" {
  const r = Math.random();
  if (r < 0.2) return "low";
  if (r < 0.7) return "medium";
  return "high";
}

function mockRrr(riskProfile: RiskProfile): number {
  if (riskProfile === "conservative") return randomInRange(1.6, 2.2);
  if (riskProfile === "moderate") return randomInRange(2.0, 2.8);
  return randomInRange(2.5, 3.5);
}

function mockRiskPct(riskProfile: RiskProfile): number {
  if (riskProfile === "conservative") return randomInRange(0.3, 0.7);
  if (riskProfile === "moderate") return randomInRange(0.7, 1.2);
  return randomInRange(1.0, 1.8);
}

function mockValidForMs(timeframe: Timeframe): number {
  switch (timeframe) {
    case "15m":
      return 2 * 60 * 60 * 1000;
    case "1h":
      return 6 * 60 * 60 * 1000;
    case "4h":
      return 12 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    default:
      return 6 * 60 * 60 * 1000;
  }
}

function buildContextSummary(params: {
  timeframe: Timeframe;
  direction: SetupDirection;
  biasScore: number;
  sentimentScore: number;
  volatilityLabel: "low" | "medium" | "high";
}): string {
  const directionText = params.direction === "long" ? "bullish" : "bearish";
  const volText = params.volatilityLabel === "low" ? "niedrig" : params.volatilityLabel === "medium" ? "mittel" : "hoch";
  const avgScore = (params.biasScore + params.sentimentScore) / 2;

  const supportText =
    avgScore >= 70
      ? "stark durch Bias und Sentiment unterstützt"
      : avgScore >= 55
      ? "solide durch Bias und Sentiment unterstützt"
      : avgScore >= 45
      ? "nur teilweise unterstützt"
      : "eher gegen den aktuellen Bias gerichtet";

  const timeframeText =
    params.timeframe === "15m"
      ? "Intraday-Skalierung"
      : params.timeframe === "1h"
      ? "intraday-swing-orientiert"
      : params.timeframe === "4h"
      ? "swing-orientiert"
      : "im höheren Timeframe verankert";

  return `Das Setup ist ${directionText}, ${timeframeText} und wird ${supportText}. Die Volatilität ist ${volText}.`;
}
