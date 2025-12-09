import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentProvider } from "./SentimentProvider";
import { CoinglassSentimentProvider } from "./coinglassSentimentProvider";

const coinglassProvider = new CoinglassSentimentProvider();

type SentimentProviderMode = "none" | "coinglass";

const SENTIMENT_PROVIDER_MODE: SentimentProviderMode =
  (process.env.SENTIMENT_PROVIDER_MODE as SentimentProviderMode) ?? "coinglass";

/**
 * Resolve the sentiment provider for a given asset. For phase 1 we only enable
 * sentiment data for crypto assets. Non-crypto instruments will return null and
 * keep the existing neutral defaults.
 */
export function resolveSentimentProvider(asset: Asset): SentimentProvider | null {
  if (SENTIMENT_PROVIDER_MODE === "none") {
    return null;
  }

  if (asset.assetClass !== "crypto") {
    return null;
  }

  switch (SENTIMENT_PROVIDER_MODE) {
    case "coinglass":
    default: {
      return coinglassProvider.isEnabled() ? coinglassProvider : null;
    }
  }
}
