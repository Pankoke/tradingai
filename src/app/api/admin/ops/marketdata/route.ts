import { NextResponse, type NextRequest } from "next/server";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";

type ActionSuccess = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  details: {
    processed: number;
    failed: number;
    logs: Array<{ symbol: string; timeframeCount: number; inserted?: number; error?: string }>;
    lookbackDays: number;
  };
};

type ActionError = {
  ok: false;
  errorCode: string;
  message: string;
};

const DEFAULT_LOOKBACK_DAYS = 5;
const MAX_LOOKBACK_DAYS = 30;

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" },
      { status: 404 },
    );
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json(
      { ok: false, errorCode: "unauthorized", message: "Missing or invalid admin session" },
      { status: 401 },
    );
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, errorCode: "forbidden", message: "Invalid request origin" }, { status: 403 });
  }

  const now = new Date();
  const body = await request.json().catch(() => ({}));
  const symbolInput = typeof body?.symbol === "string" ? body.symbol.trim() : "";
  const lookbackInput = typeof body?.lookbackDays === "number" ? Math.floor(body.lookbackDays) : undefined;
  const lookbackDays = Math.min(Math.max(lookbackInput ?? DEFAULT_LOOKBACK_DAYS, 1), MAX_LOOKBACK_DAYS);
  const from = new Date(now);
  from.setDate(from.getDate() - lookbackDays);

  const assets = await getActiveAssets();
  const matchedAssets = symbolInput
    ? assets.filter((asset) => asset.symbol.toLowerCase() === symbolInput.toLowerCase())
    : assets;

  if (symbolInput && matchedAssets.length === 0) {
    const body: ActionError = { ok: false, errorCode: "unknown_symbol", message: `Kein Asset f\u00fcr ${symbolInput}` };
    return NextResponse.json(body, { status: 400 });
  }

  const logs: Array<{ symbol: string; timeframeCount: number; inserted?: number; error?: string }> = [];
  let processed = 0;
  let failed = 0;

  const startedAt = new Date();
  for (const asset of matchedAssets) {
    try {
      await syncDailyCandlesForAsset({
        asset,
        from,
        to: now,
      });
      processed += 1;
      logs.push({
        symbol: asset.symbol,
        timeframeCount: asset.assetClass === "crypto" ? 4 : 1,
      });
    } catch (error) {
      failed += 1;
      logs.push({
        symbol: asset.symbol,
        timeframeCount: asset.assetClass === "crypto" ? 4 : 1,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }
  const finishedAt = new Date();

  const response: ActionSuccess = {
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    message: symbolInput
      ? `Market-Data Sync f\u00fcr ${symbolInput} abgeschlossen`
      : `Market-Data Sync f\u00fcr ${matchedAssets.length} Assets abgeschlossen`,
    details: {
      processed,
      failed,
      logs: logs.slice(0, 20),
      lookbackDays,
    },
  };

  return NextResponse.json(response);
}

export function GET() {
  return NextResponse.json({ ok: false, errorCode: "method_not_allowed", message: "Use POST" }, { status: 405 });
}
