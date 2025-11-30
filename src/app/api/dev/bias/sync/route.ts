import { NextRequest, NextResponse } from "next/server";
import { computeTechnicalBiasForAllActiveAssets } from "@/src/features/bias/computeTechnicalBias";

export async function POST(req: NextRequest): Promise<NextResponse<{ ok: boolean; processed?: number; skipped?: number; date?: string; error?: string }>> {
  try {
    const body = await req.json().catch(() => ({})) as { date?: string };
    const targetDate = body.date ? new Date(body.date) : new Date();

    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
    }

    const result = await computeTechnicalBiasForAllActiveAssets({ date: targetDate });
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      skipped: result.skipped,
      date: targetDate.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("[bias/sync] error", error);
    return NextResponse.json({ ok: false, error: "Bias sync failed" }, { status: 500 });
  }
}
