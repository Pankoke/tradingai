import {
  FormState,
  GeneratedSetup,
  Timeframe,
} from "@/src/features/setup-generator/types";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { computeLevelsForSetup } from "@/src/lib/engine/levels";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";

export async function generateSetupFromEngine(form: FormState): Promise<GeneratedSetup> {
  const to = new Date();
  const timeframeMs = timeframeToMs(form.timeframe);
  const from = new Date(to.getTime() - timeframeMs * 100);
  const candles = await getCandlesForAsset({
    assetId: form.asset,
    timeframe: form.timeframe,
    from,
    to,
  });

  if (!candles.length) {
    throw new Error("No candle data available");
  }

  const referencePrice = Number(candles[0].close ?? 0);
  if (!referencePrice) {
    throw new Error("Invalid reference price");
  }

  const direction =
    form.directionMode === "auto"
      ? Math.random() > 0.5
        ? "long"
        : "short"
      : form.directionMode;

  const levels = computeLevelsForSetup({
    direction,
    referencePrice,
    category: "unknown",
    volatilityScore: 50,
    confidence: 50,
    profile: deriveSetupProfileFromTimeframe(form.timeframe),
  });

  const entryParts = levels.entryZone
    ? levels.entryZone.split(" - ").map((value) => parseFloat(value.replace(/[^\d.-]/g, "")))
    : [referencePrice, referencePrice];
  const entryMin = Math.min(...entryParts);
  const entryMax = Math.max(...entryParts);
  const stopLoss = parseFloat(levels.stopLoss ?? `${referencePrice}`) || referencePrice;
  const takeProfitParts = (levels.takeProfit ?? "")
    .split("/")
    .map((value) => parseFloat(value.replace(/[^\d.-]/g, "")))
    .filter((value) => Number.isFinite(value));
  const takeProfit1 = takeProfitParts[0] ?? entryMax;
  const takeProfit2 = takeProfitParts[1] ?? takeProfit1;
  const validUntil = new Date(to.getTime() + timeframeMs * 4);

  const entryMid = (entryMin + entryMax) / 2;
  const riskDistance = Math.abs(entryMid - stopLoss) / entryMid;
  const rewardDistance = Math.abs(takeProfit1 - entryMid) / entryMid;
  const MIN_RISK_DISTANCE = 0.003;
  const safeRiskDistance = riskDistance > 0 ? riskDistance : MIN_RISK_DISTANCE;
  const riskRewardRaw = rewardDistance / safeRiskDistance;
  const riskReward = Math.max(0.1, Number(riskRewardRaw.toFixed(2)));

  let riskPct: number;
  switch (form.riskProfile) {
    case "conservative":
      riskPct = 0.5;
      break;
    case "moderate":
      riskPct = 1.0;
      break;
    case "aggressive":
      riskPct = 1.5;
      break;
    default:
      riskPct = 1.0;
  }
  const potentialPct = riskPct * riskReward;

  let volatilityLabel: "low" | "medium" | "high";
  if (safeRiskDistance < 0.005) volatilityLabel = "low";
  else if (safeRiskDistance < 0.015) volatilityLabel = "medium";
  else volatilityLabel = "high";

  let biasScore = 50 + (riskReward - 2) * 10;
  biasScore = Math.min(80, Math.max(30, biasScore));
  let sentimentScore = 50 + (riskReward - 2) * 5;
  sentimentScore = Math.min(75, Math.max(35, sentimentScore));
  const eventScore = 50;
  const balanceScore = 50;

  let confidence = 0.5;
  if (riskReward >= 2.5) confidence += 0.15;
  else if (riskReward >= 2.0) confidence += 0.1;
  if (volatilityLabel === "low") confidence += 0.1;
  if (volatilityLabel === "high") confidence -= 0.1;
  if (form.riskProfile === "aggressive" && volatilityLabel === "high") {
    confidence += 0.05;
  }
  confidence = Math.min(0.9, Math.max(0.3, confidence));

  const contextSummary = `Das Setup ist ${
    direction === "long" ? "bullish" : "bearish"
  } im ${form.timeframe.toUpperCase()}-Chart mit einem RRR von ${riskReward.toFixed(2)} : 1 und ${
    volatilityLabel === "low" ? "geringer" : volatilityLabel === "medium" ? "mittlerer" : "erhöhter"
  } Volatilität.`;

  const setup: GeneratedSetup = {
    id: `engine-${Date.now()}`,
    asset: form.asset,
    timeframe: form.timeframe,
    direction,
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskReward,
    riskPct,
    potentialPct,
    volatilityLabel,
    confidence,
    biasScore,
    sentimentScore,
    eventScore,
    balanceScore,
    validUntil,
    contextSummary,
  };

  return setup;
}

function timeframeToMs(timeframe: Timeframe): number {
  switch (timeframe) {
    case "15m":
      return 15 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "4h":
      return 4 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}
