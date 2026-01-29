import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { findDerivedPair } from "@/src/server/marketData/derived-config";
import { deriveCandlesForTimeframe, type DeriveTimeframesResult } from "@/src/server/marketData/deriveTimeframes";
import { getContainer } from "@/src/server/container";
import type { CandleTimeframe } from "@/src/domain/market-data/types";

type BackfillChunkResult = DeriveTimeframesResult & { chunkFrom: string; chunkTo: string };

type BackfillResponse =
  | {
      ok: true;
      targetTimeframe: CandleTimeframe;
      assetIds: string[];
      chunkHours: number;
      chunks: BackfillChunkResult[];
    }
  | { ok: false; errorCode: string; message: string };

const DEFAULT_CHUNK_HOURS = 24;

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" },
      { status: 404 },
    );
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, errorCode: "unauthorized", message: "Missing or invalid admin session" },
      { status: 401 },
    );
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, errorCode: "forbidden", message: "Invalid request origin" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const targetTimeframe = (typeof body?.targetTimeframe === "string" ? body.targetTimeframe : "4H") as CandleTimeframe;
  const pair = findDerivedPair(targetTimeframe);
  if (!pair) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, errorCode: "unsupported_target", message: `No derived pair for ${targetTimeframe}` },
      { status: 400 },
    );
  }

  const fromIso = typeof body?.from === "string" ? body.from : undefined;
  const toIso = typeof body?.to === "string" ? body.to : undefined;
  const chunkHours = typeof body?.chunkHours === "number" && body.chunkHours > 0 ? body.chunkHours : DEFAULT_CHUNK_HOURS;
  const asOfTo = toIso ? new Date(toIso) : new Date();
  const from = fromIso ? new Date(fromIso) : new Date(asOfTo.getTime() - 7 * 24 * 60 * 60 * 1000);
  const assetIdInput = typeof body?.assetId === "string" ? body.assetId.trim() : "";

  const assets = await getActiveAssets();
  const selectedAssets = assetIdInput ? assets.filter((a) => a.id === assetIdInput || a.symbol === assetIdInput) : assets;
  if (!selectedAssets.length) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, errorCode: "asset_not_found", message: "No matching asset" },
      { status: 404 },
    );
  }

  const container = getContainer();
  const chunks: BackfillChunkResult[] = [];

  for (const asset of selectedAssets) {
    let cursor = new Date(from);
    while (cursor < asOfTo) {
      const chunkEnd = new Date(Math.min(cursor.getTime() + chunkHours * 60 * 60 * 1000, asOfTo.getTime()));
      const result = await deriveCandlesForTimeframe({
        assetId: asset.id,
        sourceTimeframe: pair.source,
        targetTimeframe: pair.target,
        lookbackCount: pair.lookbackCount,
        asOf: chunkEnd,
        candleRepo: container.candleRepo,
        sourceLabel: "derived",
        derivedPair: pair,
      });
      chunks.push({
        ...result,
        chunkFrom: cursor.toISOString(),
        chunkTo: chunkEnd.toISOString(),
      });
      cursor = chunkEnd;
    }
  }

  return NextResponse.json<BackfillResponse>({
    ok: true,
    targetTimeframe,
    assetIds: selectedAssets.map((a) => a.id),
    chunkHours,
    chunks,
  });
}

export function GET() {
  return NextResponse.json<BackfillResponse>(
    { ok: false, errorCode: "method_not_allowed", message: "Use POST" },
    { status: 405 },
  );
}
