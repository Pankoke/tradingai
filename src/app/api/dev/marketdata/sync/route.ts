import { NextRequest, NextResponse } from "next/server";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";

type ErrorBody = { ok: false; error: string };
type SuccessBody = { ok: true };

export async function POST(req: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
  try {
    const body = (await req.json()) as {
      assetId: string;
      symbol: string;
      from: string;
      to: string;
    };

    const fromDate = new Date(body.from);
    const toDate = new Date(body.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date range" }, { status: 400 });
    }

    await syncDailyCandlesForAsset({
      assetId: body.assetId,
      symbol: body.symbol,
      from: fromDate,
      to: toDate,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[marketdata/sync] error", error);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
