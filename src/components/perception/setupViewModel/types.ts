import type { Setup, SetupGrade, SetupPlaybookType } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import type { RiskRewardSummary } from "@/src/lib/engine/types";

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
  dataSourcePrimary?: string | null;
  dataSourceUsed?: string | null;
  providerSymbolUsed?: string | null;
  timeframeUsed?: string | null;
  snapshotLabel?: string | null;
};

export type SetupViewModel = {
  id: string;
  assetId: string;
  symbol: string;
  timeframe: string;
  profile?: string | null;
  setupPlaybookId?: string | null;
  direction: Setup["direction"];
  type?: Setup["type"] | null;
  setupGrade?: SetupGrade | null;
  setupType?: SetupPlaybookType | null;
  gradeRationale?: string[] | null;
  noTradeReason?: string | null;
  gradeDebugReason?: string | null;
  setupDecision?: "TRADE" | "WATCH" | "BLOCKED";
  decisionReasons?: string[];
  decisionCategory?: "soft" | "hard" | null;
  isWatchPlus?: boolean;
  watchPlusLabel?: string | null;
  rings: Setup["rings"];
  eventContext?: Setup["eventContext"] | null;
  eventModifier?: Setup["eventModifier"] | null;
  riskReward?: RiskRewardSummary | null;
  ringAiSummary?: Setup["ringAiSummary"] | null;
  sentiment?: Setup["sentiment"] | null;
  orderflow?: Setup["orderflow"] | null;
  levelDebug?: Setup["levelDebug"] | null;
  signalQuality?: SignalQuality | null;
  entry: PriceRange;
  stop: PricePoint;
  takeProfit: PricePoint;
  bias?: HomepageSetup["bias"] | null;
  orderflowMode?: HomepageSetup["orderflowMode"] | Setup["orderflowMode"] | null;
  meta: SetupMeta;
};

export type SetupSource = Setup | HomepageSetup;
