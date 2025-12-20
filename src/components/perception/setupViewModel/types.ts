import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

export type PriceRange = {
  from: number | null;
  to: number | null;
  display?: string;
};

export type PricePoint = {
  value: number | null;
  display?: string;
};

export type SetupMeta = {
  snapshotId?: string | null;
  snapshotCreatedAt?: string | null;
  generatedAt?: string | null;
  snapshotTime?: string | null;
  weakSignal?: boolean;
  eventLevel?: "high" | "medium" | "low" | null;
};

export type SetupViewModel = {
  id: string;
  assetId: string;
  symbol: string;
  timeframe: string;
  direction: Setup["direction"];
  type?: Setup["type"] | null;
  rings: Setup["rings"];
  eventContext?: Setup["eventContext"] | null;
  riskReward?: Setup["riskReward"] | null;
  ringAiSummary?: Setup["ringAiSummary"] | null;
  sentiment?: Setup["sentiment"] | null;
  levelDebug?: Setup["levelDebug"] | null;
  entry: PriceRange;
  stop: PricePoint;
  takeProfit: PricePoint;
  bias?: HomepageSetup["bias"] | null;
  orderflowMode?: HomepageSetup["orderflowMode"] | Setup["orderflowMode"] | null;
  meta: SetupMeta;
};

export type SetupSource = Setup | HomepageSetup;
