import { NextRequest, NextResponse } from "next/server";
import { getAssetBySymbol } from "@/src/server/repositories/assetRepository";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import { db } from "@/src/server/db/db";
import { candles } from "@/src/server/db/schema/candles";
import { and, desc, eq, sql } from "drizzle-orm";

type SummaryRow = {
  timeframe: string;
  count: number;
  latestTimestamp: string | null;
  sources: string[];
};

type ErrorBody = { ok: false; error: string };
type SuccessBody = { ok: true; assetId: string; symbol: string; summaries: SummaryRow[] };

export async function GET(req: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ ok: false, error: "symbol query parameter required" }, { status: 400 });
  }

  const asset = await getAssetBySymbol(symbol);
  if (!asset) {
    return NextResponse.json({ ok: false, error: "asset not found" }, { status: 404 });
  }

  const timeframes = getTimeframesForAsset(asset);
  const summaries: SummaryRow[] = [];

  for (const timeframe of timeframes) {
    const [countRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(candles)
      .where(and(eq(candles.assetId, asset.id), eq(candles.timeframe, timeframe)));

    const latest = await db
      .select({ timestamp: candles.timestamp })
      .from(candles)
      .where(and(eq(candles.assetId, asset.id), eq(candles.timeframe, timeframe)))
      .orderBy(desc(candles.timestamp))
      .limit(1);

    const sources = await db
      .select({ source: candles.source })
      .from(candles)
      .where(and(eq(candles.assetId, asset.id), eq(candles.timeframe, timeframe)))
      .groupBy(candles.source);

    summaries.push({
      timeframe,
      count: countRow?.value ?? 0,
      latestTimestamp: latest[0]?.timestamp?.toISOString() ?? null,
      sources: sources.map((row) => row.source).filter((value): value is string => Boolean(value)),
    });
  }

  return NextResponse.json({
    ok: true,
    assetId: asset.id,
    symbol: asset.symbol,
    summaries,
  });
}
