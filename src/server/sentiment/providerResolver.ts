import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentProvider } from "./SentimentProvider";
import { InternalSentimentProvider } from "./internalSentimentProvider";

type SentimentProviderMode = "internal" | "none";

const SENTIMENT_PROVIDER_MODE: SentimentProviderMode =
  (process.env.SENTIMENT_PROVIDER_MODE as SentimentProviderMode) ?? "internal";

const internalProvider = new InternalSentimentProvider();

export function resolveSentimentProvider(asset: Asset): SentimentProvider | null {
  if (SENTIMENT_PROVIDER_MODE === "none") {
    return null;
  }

  return internalProvider;
}
