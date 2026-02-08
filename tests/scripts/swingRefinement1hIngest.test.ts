import { describe, expect, it, vi } from "vitest";
import type { Asset } from "@/src/server/repositories/assetRepository";
import {
  ingestSwingRefinementOneHourCandles,
  normalizeAssetKeys,
  selectSwingRefinementAssets,
} from "@/src/scripts/swingRefinement1hIngest";

function makeAsset(id: string, symbol: string): Asset {
  return {
    id,
    symbol,
    displaySymbol: symbol,
    name: symbol,
    assetClass: "commodity",
    baseCurrency: null,
    quoteCurrency: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("swingRefinement1hIngest", () => {
  it("normalizes and deduplicates target keys", () => {
    expect(normalizeAssetKeys([" wti ", "WTI", "silver"])).toEqual(["WTI", "SILVER"]);
  });

  it("selects assets by id or symbol match", () => {
    const assets = [makeAsset("wti", "CL=F"), makeAsset("gold", "GC=F"), makeAsset("btc", "BTCUSDT")];
    const selected = selectSwingRefinementAssets(assets, ["WTI", "GC=F"]);
    expect(selected.map((asset) => asset.id)).toEqual(["wti", "gold"]);
  });

  it("ingests only 1H and only matched target assets", async () => {
    const assets = [makeAsset("wti", "CL=F"), makeAsset("silver", "SILVER"), makeAsset("btc", "BTCUSDT")];
    const syncDailyCandlesForAsset = vi.fn(async () => [
      { timeframe: "1H" as const, inserted: 12, provider: "mock" },
    ]);

    const result = await ingestSwingRefinementOneHourCandles({
      activeAssets: assets,
      deps: { syncDailyCandlesForAsset },
      now: new Date("2026-02-07T00:00:00Z"),
      lookbackDays: 30,
      targetKeys: ["WTI", "SILVER"],
    });

    expect(result.selectedAssetIds).toEqual(["wti", "silver"]);
    expect(syncDailyCandlesForAsset).toHaveBeenCalledTimes(2);
    for (const call of syncDailyCandlesForAsset.mock.calls) {
      expect(call[0].timeframe).toBe("1H");
      expect(call[0].asset.id === "wti" || call[0].asset.id === "silver").toBe(true);
    }
  });
});
