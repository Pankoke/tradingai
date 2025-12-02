import {
  FormState,
  GeneratedSetup,
  Timeframe,
} from "@/src/features/setup-generator/types";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { computeLevelsForSetup } from "@/src/lib/engine/levels";

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

  const marketData = {
    asset: form.asset,
    timeframe: form.timeframe,
    candles,
  };

  const referencePrice = candles[0]?.close ?? 0;
  const direction = form.directionMode === "auto" ? (Math.random() > 0.5 ? "long" : "short") : form.directionMode;
  const levels = computeLevelsForSetup({
    direction,
    referencePrice,
    category: "unknown",
    volatilityScore: 50,
    confidence: 50,
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

  const preparedSetup = {
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2,
    validUntil,
  };

  console.log("Prepared levels", preparedSetup, marketData);

  // TODO: 1. Price + Market Context laden (candles, bias, sentiment, volatility)
  // TODO: 2. Engine-Module ansprechen (trend-detection, volatility/score, bias/sentiment helpers)
  // TODO: 3. Entry / SL / TP über computeLevelsForSetup oder ähnliche Helper ableiten
  // TODO: 4. RiskReward + Scores (rrr, riskPct, potentialPct) berechnen
  // TODO: 5. Gültigkeit („validUntil“) anhand Timeframe und Candle-Latenz bestimmen
  // TODO: 6. Ergebnis in das GeneratedSetup-Shape mappen (inkl. Context Summary)
  throw new Error("Engine-based setup generation not implemented yet.");
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
