import type { Setup } from "@/src/lib/engine/types";

export type SortKey = "confidence" | "sentiment" | "direction" | "signalQuality" | "rrr" | "generated";
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

const getSignalQualityScore = (s: Setup): number => {
  const direct = (s as unknown as { signalQuality?: number }).signalQuality;
  if (typeof direct === "number") return direct;
  const ringScores = [
    s.rings?.trendScore,
    s.rings?.biasScore,
    s.rings?.sentimentScore,
    s.rings?.orderflowScore,
    s.rings?.eventScore,
  ].filter((n) => typeof n === "number") as number[];
  if (ringScores.length === 0) return 0;
  return ringScores.reduce((sum, val) => sum + val, 0) / ringScores.length;
};

const getRrr = (s: Setup): number => s.riskReward?.rrr ?? 0;

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
    if (sort === "confidence") return (a.confidence - b.confidence) * direction;
    if (sort === "sentiment") return (a.sentimentScore - b.sentimentScore) * direction;
    if (sort === "direction") return a.direction.localeCompare(b.direction) * direction;
    if (sort === "signalQuality") return (getSignalQualityScore(a) - getSignalQualityScore(b)) * direction;
    if (sort === "rrr") return (getRrr(a) - getRrr(b)) * direction;
    if (sort === "generated") return getGeneratedTime(a).localeCompare(getGeneratedTime(b)) * direction;
    return 0;
  });
}
