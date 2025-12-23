import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getAssetCandleStats } from "@/src/server/repositories/candleRepository";
import { classifyTimeframeStatus, deriveProfileCoverage, type CoverageRow } from "@/src/lib/admin/coverageRules";

const TIMEFRAMES: string[] = ["1W", "1D", "4H", "1H", "15m"];

export async function loadCoverageMatrix(): Promise<CoverageRow[]> {
  const assets = await getActiveAssets();
  const stats = await getAssetCandleStats({ timeframes: TIMEFRAMES });

  const rows: CoverageRow[] = assets.map((asset) => {
    const tfMap: CoverageRow["timeframes"] = {};
    const relevant = stats.filter((s) => s.assetId === asset.id);
    for (const tf of TIMEFRAMES) {
      const matches = relevant.filter((s) => s.timeframe === tf);
      const latest = matches.sort((a, b) => {
        const at = a.lastTimestamp?.getTime() ?? 0;
        const bt = b.lastTimestamp?.getTime() ?? 0;
        return bt - at;
      })[0];
      const ts = latest?.lastTimestamp ?? null;
      const ageMinutes = ts ? (Date.now() - ts.getTime()) / 60000 : null;
      tfMap[tf] = {
        lastTimestamp: ts ? ts.toISOString() : null,
        ageMinutes,
        status: classifyTimeframeStatus(tf, ageMinutes),
        source: latest?.source ?? null,
      };
    }

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      displayName: (asset as { displayName?: string }).displayName ?? asset.symbol,
      provider: (asset as { dataProvider?: string | null }).dataProvider ?? null,
      timeframes: tfMap,
      profiles: deriveProfileCoverage(tfMap as Record<string, any>),
    };
  });

  return rows;
}
