import { NextResponse, type NextRequest } from "next/server";
import { getAssetBySymbol } from "@/src/server/repositories/assetRepository";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import {
  buildOrderflowMetrics,
  ORDERFLOW_TIMEFRAMES,
} from "@/src/lib/engine/orderflowMetrics";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

export async function GET(request: NextRequest) {
  const symbolParam = request.nextUrl.searchParams.get("symbol");
  if (!symbolParam) {
    return NextResponse.json(
      { ok: false, error: "Query parameter 'symbol' is required" },
      { status: 400 },
    );
  }

  const normalizedSymbol = symbolParam.trim();
  const asset =
    (await getAssetBySymbol(normalizedSymbol)) ??
    (await getAssetBySymbol(normalizedSymbol.toUpperCase())) ??
    (await getAssetBySymbol(normalizedSymbol.toLowerCase()));

  if (!asset) {
    return NextResponse.json(
      { ok: false, error: `No asset found for symbol ${normalizedSymbol}` },
      { status: 404 },
    );
  }

  const configured = getTimeframesForAsset(asset);
  const supported = configured.filter((tf): tf is MarketTimeframe =>
    ORDERFLOW_TIMEFRAMES.includes(tf as MarketTimeframe),
  );
  const timeframes = supported.length > 0 ? supported : ORDERFLOW_TIMEFRAMES;
  const metrics = await buildOrderflowMetrics({
    asset,
    timeframes,
  });

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      symbol: asset.symbol,
      assetClass: asset.assetClass ?? null,
    },
    requestedTimeframes: timeframes,
    metrics,
  });
}
