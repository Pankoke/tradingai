import { NextRequest, NextResponse } from "next/server";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { resolveMarketDataProvider } from "@/src/server/marketData/providerResolver";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get("symbol")?.toUpperCase() ?? "BTCUSDT";

  const assets = await getActiveAssets();
  const asset = assets.find((row) => row.symbol.toUpperCase() === symbolParam);
  if (!asset) {
    return NextResponse.json({ error: `asset ${symbolParam} not found` }, { status: 404 });
  }

  const provider = resolveMarketDataProvider(asset);
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000);
  const candles = await provider.fetchCandles({
    asset,
    timeframe: "1H",
    from,
    to: now,
    limit: 5,
  });

  return NextResponse.json({
    provider: provider.provider,
    asset: asset.symbol,
    candles: candles.map((c) => ({
      timestamp: c.timestamp,
      close: c.close,
      source: c.source,
    })),
  });
}
