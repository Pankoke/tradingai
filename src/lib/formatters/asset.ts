export type AssetMeta = {
  displaySymbol: string;
  name: string;
  assetClass: string;
};

export type AssetDisplayContext = {
  profile?: string | null;
  timeframe?: string | null;
  snapshotLabel?: string | null;
  providerSymbolUsed?: string | null;
  dataSourceUsed?: string | null;
};

const MOJIBAKE_SEPARATORS: RegExp[] = [/Жњ/g, /Ð–Ñš/g, /Ãâ€“Ã‘Å¡/g];

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

function sanitizeAssetText(value: string): string {
  let sanitized = value;
  for (const pattern of MOJIBAKE_SEPARATORS) {
    sanitized = sanitized.replace(pattern, " - ");
  }
  return sanitized.replace(/\s+/g, " ").trim();
}

function isIntradayContext(context?: AssetDisplayContext): boolean {
  const tf = context?.timeframe?.toUpperCase();
  const profile = context?.profile?.toUpperCase();
  const label = context?.snapshotLabel?.toLowerCase();
  return profile === "INTRADAY" || label === "intraday" || tf === "1H" || tf === "4H";
}

export function getAssetMeta(assetId?: string, fallbackSymbol?: string, context?: AssetDisplayContext): AssetMeta {
  const lookupKey = normalizeKey(assetId) ?? normalizeKey(fallbackSymbol);
  const baseMeta =
    lookupKey && lookupKey in ASSET_LOOKUP
      ? ASSET_LOOKUP[lookupKey]
      : {
          displaySymbol: fallbackSymbol ?? assetId ?? "Asset",
          name: fallbackSymbol ?? assetId ?? "Asset",
          assetClass: "Asset",
        };

  const upperSymbol = (fallbackSymbol ?? "").toUpperCase();
  const isGold =
    lookupKey === "gold" ||
    upperSymbol === "GC=F" ||
    upperSymbol === "XAUUSD" ||
    upperSymbol === "XAUUSD=X" ||
    upperSymbol === "GOLD";

  if (isGold && isIntradayContext(context)) {
    return {
      displaySymbol: "XAU/USD",
      name: "Gold Spot (XAU/USD)",
      assetClass: baseMeta.assetClass,
    };
  }

  return {
    displaySymbol: sanitizeAssetText(baseMeta.displaySymbol),
    name: sanitizeAssetText(baseMeta.name),
    assetClass: baseMeta.assetClass,
  };
}

export function formatAssetLabel(assetId?: string, symbol?: string, context?: AssetDisplayContext): string {
  const meta = getAssetMeta(assetId, symbol, context);
  const displaySymbol = sanitizeAssetText(meta.displaySymbol);
  const name = sanitizeAssetText(meta.name);
  if (name !== displaySymbol) {
    return `${displaySymbol} - ${name}`;
  }
  return displaySymbol;
}
