import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { findDerivedPair } from "@/src/server/marketData/derived-config";

type HealthEntry = {
  assetId: string;
  targetTimeframe: string;
  lastDerivedAt: string | null;
  derivedCountRecent: number;
  missingInputsRecent?: number;
  warnings?: string[];
};

type HealthResponse =
  | { ok: true; windowHours: number; entries: HealthEntry[] }
  | { ok: false; errorCode: string; message: string };

const DEFAULT_WINDOW_HOURS = 24;

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json<HealthResponse>(
      { ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" },
      { status: 404 },
    );
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json<HealthResponse>(
      { ok: false, errorCode: "unauthorized", message: "Missing or invalid admin session" },
      { status: 401 },
    );
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json<HealthResponse>(
      { ok: false, errorCode: "forbidden", message: "Invalid request origin" },
      { status: 403 },
    );
  }

  const windowHours = DEFAULT_WINDOW_HOURS;
  const to = new Date();
  const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);
  const assets = await getActiveAssets();
  const pair = findDerivedPair("4H");

  const entries: HealthEntry[] = [];
  for (const asset of assets) {
    if (!pair) continue;
    const candles = await getCandlesForAsset({
      assetId: asset.id,
      timeframe: pair.target,
      from,
      to,
    });
    const derivedOnly = candles.filter((c) => c.source?.toLowerCase() === "derived");
    const lastDerivedAt = derivedOnly[0]?.timestamp ?? null;
    entries.push({
      assetId: asset.id,
      targetTimeframe: pair.target,
      lastDerivedAt: lastDerivedAt ? lastDerivedAt.toISOString() : null,
      derivedCountRecent: derivedOnly.length,
      warnings: derivedOnly.length ? [] : ["no_derived_in_window"],
    });
  }

  return NextResponse.json<HealthResponse>({ ok: true, windowHours, entries });
}
