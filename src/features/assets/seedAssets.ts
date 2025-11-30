import { db } from "@/src/server/db/db";
import { assets } from "@/src/server/db/schema/assets";
import { eq } from "drizzle-orm";

type NewAsset = typeof assets["$inferInsert"];

const SEED_ASSETS: NewAsset[] = [
  {
    id: "dax",
    symbol: "^GDAXI",
    displaySymbol: "DAX",
    name: "DAX Index",
    assetClass: "index",
    isActive: true,
  },
  {
    id: "spx",
    symbol: "^GSPC",
    displaySymbol: "S&P 500",
    name: "S&P 500 Index",
    assetClass: "index",
    isActive: true,
  },
  {
    id: "ndx",
    symbol: "^NDX",
    displaySymbol: "Nasdaq 100",
    name: "Nasdaq 100 Index",
    assetClass: "index",
    isActive: true,
  },
  {
    id: "dow",
    symbol: "^DJI",
    displaySymbol: "Dow Jones",
    name: "Dow Jones Index",
    assetClass: "index",
    isActive: true,
  },
  {
    id: "eurusd",
    symbol: "EURUSD=X",
    displaySymbol: "EUR/USD",
    name: "Euro vs US Dollar",
    assetClass: "fx",
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    isActive: true,
  },
  {
    id: "gbpusd",
    symbol: "GBPUSD=X",
    displaySymbol: "GBP/USD",
    name: "British Pound vs US Dollar",
    assetClass: "fx",
    baseCurrency: "GBP",
    quoteCurrency: "USD",
    isActive: true,
  },
  {
    id: "usdjpy",
    symbol: "USDJPY=X",
    displaySymbol: "USD/JPY",
    name: "US Dollar vs Japanese Yen",
    assetClass: "fx",
    baseCurrency: "USD",
    quoteCurrency: "JPY",
    isActive: true,
  },
  {
    id: "eurjpy",
    symbol: "EURJPY=X",
    displaySymbol: "EUR/JPY",
    name: "Euro vs Japanese Yen",
    assetClass: "fx",
    baseCurrency: "EUR",
    quoteCurrency: "JPY",
    isActive: true,
  },
  {
    id: "gold",
    symbol: "GC=F",
    displaySymbol: "Gold",
    name: "Gold Futures",
    assetClass: "commodity",
    isActive: true,
  },
  {
    id: "silver",
    symbol: "SI=F",
    displaySymbol: "Silver",
    name: "Silver Futures",
    assetClass: "commodity",
    isActive: true,
  },
  {
    id: "wti",
    symbol: "CL=F",
    displaySymbol: "WTI",
    name: "Crude Oil WTI",
    assetClass: "commodity",
    isActive: true,
  },
  {
    id: "btc",
    symbol: "BTC-USD",
    displaySymbol: "BTC/USD",
    name: "Bitcoin",
    assetClass: "crypto",
    baseCurrency: "BTC",
    quoteCurrency: "USD",
    isActive: true,
  },
  {
    id: "eth",
    symbol: "ETH-USD",
    displaySymbol: "ETH/USD",
    name: "Ethereum",
    assetClass: "crypto",
    baseCurrency: "ETH",
    quoteCurrency: "USD",
    isActive: true,
  },
];

export async function seedAssets(): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const entry of SEED_ASSETS) {
    const existing = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.id, entry.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(assets).values(entry);
      inserted += 1;
      continue;
    }

    await db
      .update(assets)
      .set({
        symbol: entry.symbol,
        displaySymbol: entry.displaySymbol,
        name: entry.name,
        assetClass: entry.assetClass,
        baseCurrency: entry.baseCurrency,
        quoteCurrency: entry.quoteCurrency,
        isActive: entry.isActive ?? true,
      })
      .where(eq(assets.id, entry.id));
    updated += 1;
  }

  return { inserted, updated };
}
