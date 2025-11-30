export type AssetMeta = {
  displaySymbol: string;
  name: string;
  assetClass: string;
};

const ASSET_LOOKUP: Record<string, AssetMeta> = {
  dax: { displaySymbol: "DAX", name: "DAX Index", assetClass: "Index" },
  spx: { displaySymbol: "S&P 500", name: "S&P 500 Index", assetClass: "Index" },
  ndx: { displaySymbol: "Nasdaq 100", name: "Nasdaq 100 Index", assetClass: "Index" },
  dow: { displaySymbol: "Dow Jones", name: "Dow Jones Index", assetClass: "Index" },
  eurusd: { displaySymbol: "EUR/USD", name: "Euro vs. US Dollar", assetClass: "FX" },
  gbpusd: { displaySymbol: "GBP/USD", name: "British Pound vs. US Dollar", assetClass: "FX" },
  usdjpy: { displaySymbol: "USD/JPY", name: "US Dollar vs. Japanese Yen", assetClass: "FX" },
  eurjpy: { displaySymbol: "EUR/JPY", name: "Euro vs. Japanese Yen", assetClass: "FX" },
  gold: { displaySymbol: "Gold", name: "Gold Futures", assetClass: "Commodity" },
  silver: { displaySymbol: "Silver", name: "Silver Futures", assetClass: "Commodity" },
  wti: { displaySymbol: "WTI", name: "Crude Oil WTI", assetClass: "Commodity" },
  btc: { displaySymbol: "BTC/USD", name: "Bitcoin", assetClass: "Crypto" },
  eth: { displaySymbol: "ETH/USD", name: "Ethereum", assetClass: "Crypto" },
};

function normalizeKey(key?: string): string | undefined {
  return key?.toLowerCase();
}

export function getAssetMeta(assetId?: string, fallbackSymbol?: string): AssetMeta {
  const lookupKey = normalizeKey(assetId) ?? normalizeKey(fallbackSymbol);
  if (lookupKey && lookupKey in ASSET_LOOKUP) {
    return ASSET_LOOKUP[lookupKey];
  }
  const fallbackLabel = fallbackSymbol ?? assetId ?? "Asset";
  return {
    displaySymbol: fallbackLabel,
    name: fallbackLabel,
    assetClass: "Asset",
  };
}

export function formatAssetLabel(assetId?: string, symbol?: string): string {
  const meta = getAssetMeta(assetId, symbol);
  if (meta.name !== meta.displaySymbol) {
    return `${meta.displaySymbol} · ${meta.name}`;
  }
  return meta.displaySymbol;
}
