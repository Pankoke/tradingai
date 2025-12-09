import { NextResponse } from "next/server";
import { getAssetBySymbol, getActiveAssets } from "@/src/server/repositories/assetRepository";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbolParam = url.searchParams.get("symbol") ?? "BTCUSDT";

  let asset = await getAssetBySymbol(symbolParam);
  if (!asset) {
    const all = await getActiveAssets();
    asset = all.find((entry) => entry.symbol.toUpperCase() === symbolParam.toUpperCase());
  }

  if (!asset) {
    return NextResponse.json(
      { ok: false, error: `Asset ${symbolParam} not found` },
      { status: 404 },
    );
  }

  const provider = resolveSentimentProvider(asset);
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "No sentiment provider configured for this asset" },
      { status: 400 },
    );
  }

  const raw = await provider.fetchFundingAndOi({ asset });
  if (!raw) {
    return NextResponse.json(
      { ok: false, error: "Provider did not return data" },
      { status: 502 },
    );
  }

  const metrics = buildSentimentMetrics({ asset, sentiment: raw });
  return NextResponse.json({
    ok: true,
    provider: provider.source,
    asset: asset.symbol,
    metrics,
  });
}
