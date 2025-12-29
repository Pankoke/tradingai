import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { getSnapshotByTime } from "@/src/server/repositories/perceptionSnapshotRepository";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

function isAuthorized(request: Request): boolean {
  const token = process.env.CRON_SECRET;
  if (!token) return true;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const value = header.replace("Bearer", "").trim();
  return value === token;
}

export async function POST(request: NextRequest | Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params =
    "nextUrl" in request && (request as NextRequest).nextUrl
      ? (request as NextRequest).nextUrl.searchParams
      : new URL(request.url).searchParams;
  const days = parseInt(params.get("days") ?? "30", 10);
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") ?? "500", 10)));
  const dryRun = params.get("dryRun") === "1" || params.get("dry_run") === "1";
  const assetParam = params.get("assetId") ?? undefined;
  const assetFilter = resolveAssetIds(assetParam);
  const today = new Date();
  let built = 0;
  let skipped = 0;
  const startedAt = Date.now();
  for (let i = days; i >= 0; i -= 1) {
    if (built >= limit) break;
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - i);
    const existing = await getSnapshotByTime({ snapshotTime: date });
    if (existing) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      built += 1;
      continue;
    }
    await buildAndStorePerceptionSnapshot({
      snapshotTime: date,
      allowSync: false,
      profiles: ["SWING"],
      source: "cron",
      assetFilter,
    });
    built += 1;
  }

  await createAuditRun({
    action: "snapshot_build_swing_backfill",
    source: "cron",
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "swing_backfill",
    meta: { built, skipped, days, limit, dryRun, assetId: assetParam },
  });

  return respondOk({ built, skipped });
}

function resolveAssetIds(assetId?: string | null): string[] | undefined {
  if (!assetId) return undefined;
  const trimmed = assetId.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "gold") {
    return ["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"];
  }
  return [trimmed];
}
