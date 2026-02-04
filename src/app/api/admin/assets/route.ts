import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const assets = await getActiveAssets();
  const payload = assets.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    displaySymbol: a.displaySymbol,
    name: a.name,
    assetClass: a.assetClass,
  }));
  return NextResponse.json({ ok: true, assets: payload });
}
