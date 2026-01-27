import type { Setup } from "@/src/lib/engine/types";
import { filterSetupsByProfile, parseProfileFilter } from "@/src/lib/setups/profileFilter";
import { getDecisionOrder } from "@/src/lib/decision/setupDecision";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

export type SortKey = "signal_quality" | "confidence" | "risk_reward" | "direction";
export type SortDir = "asc" | "desc";

export type AssetOption = {
  symbol: string;
  display: string;
  count: number;
};

const INDEX_NAME_MAP: Record<string, string> = {
  "^DJI": "Dow Jones",
  "^GDAXI": "DAX",
  "^GSPC": "S&P 500",
  "^NDX": "Nasdaq 100",
};

const FUTURES_NAME_MAP: Record<string, string> = {
  "CL=F": "Crude Oil",
  "GC=F": "Gold",
  "SI=F": "Silver",
  "HG=F": "Copper",
  "NG=F": "Nat Gas",
};

export function displayAssetName(symbol: string): string {
  if (INDEX_NAME_MAP[symbol]) return INDEX_NAME_MAP[symbol];
  if (FUTURES_NAME_MAP[symbol]) return FUTURES_NAME_MAP[symbol];

  if (symbol.includes("-")) {
    // e.g. BTC-USD -> BTC
    return symbol.split("-")[0] || symbol;
  }

  if (symbol.endsWith("=X")) {
    const pair = symbol.replace("=X", "");
    if (pair.length === 6) return `${pair.slice(0, 3)}/${pair.slice(3)}`;
    return pair;
  }

  return symbol;
}

export function buildAssetOptions(setups: Setup[]): AssetOption[] {
  const counts = setups.reduce<Record<string, number>>((acc, setup) => {
    acc[setup.symbol] = (acc[setup.symbol] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([symbol, count]) => ({ symbol, count, display: displayAssetName(symbol) }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.display.localeCompare(b.display);
    });
}

const getSignalQualityScore = (s: Setup): number | undefined => {
  const direct = (s as unknown as { signalQuality?: number }).signalQuality;
  if (typeof direct === "number") return direct;
  return undefined;
};

const getConfidenceRing = (s: Setup): number | undefined => {
  const ringVal = s.rings?.confidenceScore;
  return typeof ringVal === "number" ? ringVal : undefined;
};

const getTrendScore = (s: Setup): number | null =>
  typeof s.rings?.trendScore === "number" ? s.rings.trendScore : null;

const getBiasScore = (s: Setup): number | null =>
  typeof s.biasScore === "number" ? s.biasScore : typeof s.rings?.biasScore === "number" ? s.rings.biasScore : null;

const getDecisionRank = (
  setup: Setup,
): {
  order: number;
  isWatchPlus: boolean;
  signalQualityScore: number | null;
  decision: "TRADE" | "WATCH_PLUS" | "WATCH" | "BLOCKED" | null;
} => {
  const rawDecision =
    (setup as { decision?: string | null }).decision ??
    (setup as { setupDecision?: string | null }).setupDecision ??
    null;
  const normalizedDecision = rawDecision && typeof rawDecision === "string" ? rawDecision.toUpperCase() : null;
  const decision =
    normalizedDecision === "TRADE" ||
    normalizedDecision === "WATCH_PLUS" ||
    normalizedDecision === "WATCH" ||
    normalizedDecision === "BLOCKED"
      ? (normalizedDecision as "TRADE" | "WATCH_PLUS" | "WATCH" | "BLOCKED")
      : null;
  const signalQuality = computeSignalQuality(setup);
  const isWatchPlus = decision === "WATCH_PLUS";

  const order = getDecisionOrder(decision ?? undefined);

  return {
    order,
    isWatchPlus,
    signalQualityScore: signalQuality?.score ?? null,
    decision,
  };
};

const getRrr = (s: Setup): number | undefined => (typeof s.riskReward?.rrr === "number" ? s.riskReward.rrr : undefined);

const getGeneratedTime = (s: Setup): string =>
  s.snapshotCreatedAt ?? (s as unknown as { snapshotTimestamp?: string }).snapshotTimestamp ?? "";

export function applyFilter(setups: Setup[], filter: string, asset?: string | null): Setup[] {
  const byDirection =
    filter === "long" ? setups.filter((s) => s.direction === "Long") : filter === "short" ? setups.filter((s) => s.direction === "Short") : setups;
  if (asset && asset !== "all") {
    const match = asset.toLowerCase();
    return byDirection.filter((s) => s.symbol.toLowerCase() === match);
  }
  return byDirection;
}

export function applySort(setups: Setup[], sort: SortKey, dir: SortDir): Setup[] {
  const direction = dir === "asc" ? 1 : -1;
  const cloned = [...setups];

  return cloned.sort((a, b) => {
    const rankA = getDecisionRank(a);
    const rankB = getDecisionRank(b);
    const decisionOrderDiff = rankA.order - rankB.order;
    if (decisionOrderDiff !== 0) return decisionOrderDiff;

    if (rankA.order === 0 && rankB.order === 0) {
      const gradeOrder = (grade: Setup["setupGrade"] | null | undefined): number => {
        if (grade === "A") return 0;
        if (grade === "B") return 1;
        return 2;
      };
      const gradeDiff =
        gradeOrder((a as { setupGrade?: Setup["setupGrade"] | null }).setupGrade) -
        gradeOrder((b as { setupGrade?: Setup["setupGrade"] | null }).setupGrade);
      if (gradeDiff !== 0) return gradeDiff;
    }

    if (rankA.order === 1 && rankB.order === 1) {
      const trendDiff = (getTrendScore(b) ?? -Infinity) - (getTrendScore(a) ?? -Infinity);
      if (trendDiff !== 0) return trendDiff;
      const biasDiff = (getBiasScore(b) ?? -Infinity) - (getBiasScore(a) ?? -Infinity);
      if (biasDiff !== 0) return biasDiff;
      const sqDiff = (rankB.signalQualityScore ?? -Infinity) - (rankA.signalQualityScore ?? -Infinity);
      if (sqDiff !== 0) return sqDiff;
      const confDiff = (getConfidenceRing(b) ?? -Infinity) - (getConfidenceRing(a) ?? -Infinity);
      if (confDiff !== 0) return confDiff;
    }

    if (sort === "signal_quality") {
      const av = getSignalQualityScore(a);
      const bv = getSignalQualityScore(b);
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return (av - bv) * direction;
    }
    if (sort === "confidence") {
      const av = getConfidenceRing(a);
      const bv = getConfidenceRing(b);
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return (av - bv) * direction;
    }
    if (sort === "risk_reward") {
      const av = getRrr(a);
      const bv = getRrr(b);
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return (av - bv) * direction;
    }
    if (sort === "direction") {
      const aVal = a.direction === "Long" ? 0 : 1;
      const bVal = b.direction === "Long" ? 0 : 1;
      const dirCmp = (aVal - bVal) * direction;
      if (dirCmp !== 0) return dirCmp;
      const fallbackA = getConfidenceRing(a) ?? 0;
      const fallbackB = getConfidenceRing(b) ?? 0;
      return (fallbackB - fallbackA) * direction * -1;
    }
    return 0;
  });
}

export function filterPremiumByProfile(
  setups: Setup[],
  profileParam?: string | null,
): { selectedProfile: string | null; filtered: Setup[]; effective: Setup[] } {
  const selectedProfile = parseProfileFilter(profileParam ?? null);
  const filtered = filterSetupsByProfile(setups, selectedProfile);
  const effective = filtered.length ? filtered : setups;
  return { selectedProfile, filtered, effective };
}
