import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getThrottler, consumeThrottlerStats } from "@/src/server/marketData/requestThrottler";
import { TwelveDataMarketDataProvider } from "@/src/server/marketData/twelvedataMarketDataProvider";
import { FinnhubMarketDataProvider } from "@/src/server/marketData/finnhubMarketDataProvider";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { validateCandles } from "@/src/server/marketData/candleValidation";
import { respondFail } from "@/src/server/http/apiResponse";
import type { Asset } from "@/src/server/repositories/assetRepository";

const CRON_SECRET = process.env.CRON_SECRET;
const DEFAULT_ASSETS: Asset[] = [
  {
    id: "BTC",
    symbol: "BTCUSD",
    displaySymbol: "BTC/USD",
    name: "Bitcoin",
    assetClass: "crypto",
    baseCurrency: null,
    quoteCurrency: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "ETH",
    symbol: "ETHUSD",
    displaySymbol: "ETH/USD",
    name: "Ethereum",
    assetClass: "crypto",
    baseCurrency: null,
    quoteCurrency: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "GOLD",
    symbol: "GC=F",
    displaySymbol: "XAU/USD",
    name: "Gold",
    assetClass: "commodity",
    baseCurrency: null,
    quoteCurrency: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

type ProviderResult = {
  provider: string;
  asset: string;
  timeframe: MarketTimeframe;
  ok: boolean;
  count: number;
  firstTs: string | null;
  lastTs: string | null;
  errors: string[];
  sample?: { open: number; high: number; low: number; close: number; volume?: number };
};

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim() === CRON_SECRET;
  }
  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const search = request.nextUrl.searchParams;
  const include15m = search.get("scalp") === "1" || process.env.ENABLE_SCALP_CANDLES === "1";
  const assets: Asset[] = DEFAULT_ASSETS;
  const timeframes: MarketTimeframe[] = include15m ? ["1H", "15m"] : ["1H"];
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = new Date();

  const providers = [
    new TwelveDataMarketDataProvider(),
    new FinnhubMarketDataProvider(),
  ];

  const results: ProviderResult[] = [];

  for (const provider of providers) {
    const throttler = getThrottler(provider.provider);
    for (const asset of assets) {
      for (const timeframe of timeframes) {
        try {
          const candles = await provider.fetchCandles({
            asset,
            timeframe,
            from,
            to,
          });
          const validation = validateCandles(candles, { expectTimeframeMinutes: timeframe === "1H" ? 60 : 15 });
          results.push({
            provider: provider.provider,
            asset: asset.id,
            timeframe,
            ok: validation.ok,
            count: validation.count,
            firstTs: validation.firstTs,
            lastTs: validation.lastTs,
            errors: validation.errors,
            sample: candles[0]
              ? {
                  open: Number(candles[0].open),
                  high: Number(candles[0].high),
                  low: Number(candles[0].low),
                  close: Number(candles[0].close),
                  volume: candles[0].volume !== undefined ? Number(candles[0].volume) : undefined,
                }
              : undefined,
          });
        } catch (error) {
          results.push({
            provider: provider.provider,
            asset: asset.id,
            timeframe,
            ok: false,
            count: 0,
            firstTs: null,
            lastTs: null,
            errors: [error instanceof Error ? error.message : "unknown_error"],
          });
        } finally {
          throttler.consumeStats();
        }
      }
    }
  }

  const throttleStats = consumeThrottlerStats();

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    assets,
    timeframes,
    from: from.toISOString(),
    to: to.toISOString(),
    results,
    throttling: throttleStats,
  });
}
