import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import {
  deleteSnapshotsByDayAndLabel,
  findSnapshotByDayAndLabel,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { buildPerceptionSnapshotWithContainer } from "@/src/server/perception/perceptionEngineFactory";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { maybeEnhanceRingAiSummaryWithLLM } from "@/src/server/ai/ringSummaryOpenAi";

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
  const force = params.get("force") === "1" || params.get("rebuild") === "1";
  const assetParam = params.get("assetId") ?? undefined;
  const assetFilter = resolveAssetIds(assetParam);
  const recentFirst = params.get("recentFirst") === "1";
  const debug = params.get("debug") === "1";
  const today = new Date();
  let built = 0;
  let skipped = 0;
  let rebuilt = 0;
  const startedAt = Date.now();
  let goldSetupsTotal = 0;
  const labels: Array<"morning" | "us_open" | "eod" | null> = ["morning", "us_open", "eod", null];
  const labelTimes: Record<"morning" | "us_open" | "eod" | "null", number> = {
    morning: 7, // UTC 07:00 -> deriveSnapshotLabel => morning
    us_open: 12, // UTC 12:00 -> us_open
    eod: 17, // UTC 17:00 -> eod
    null: 0,
  };

  const offsets = Array.from({ length: days + 1 }, (_, idx) => idx);
  const orderedOffsets = recentFirst ? offsets : offsets.reverse();
  for (const offset of orderedOffsets) {
    if (built >= limit) break;
    for (const label of labels) {
      if (built >= limit) break;
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      date.setUTCDate(date.getUTCDate() - offset);
      const hourKey = label === null ? "null" : label;
      const snapshotTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), labelTimes[hourKey]));

      const existing = await findSnapshotByDayAndLabel({ day: snapshotTime, label });
      if (existing && !force) {
        skipped += 1;
        continue;
      }
      if (dryRun) {
        built += 1;
        if (existing) rebuilt += 1;
        continue;
      }
      if (force && existing) {
        await deleteSnapshotsByDayAndLabel({ day: snapshotTime, label });
      }

      const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
      const result = await buildAndStorePerceptionSnapshot({
        snapshotTime,
        allowSync: false,
        profiles: ["SWING"],
        source: "cron",
        assetFilter,
        snapshotId: undefined,
        snapshotStore,
        deps: {
          buildPerceptionSnapshot: buildPerceptionSnapshotWithContainer,
          getActiveAssets,
          maybeEnhanceRingAiSummaryWithLLM,
        },
      });
      built += 1;
      if (existing) rebuilt += 1;

      if (debug) {
        const goldIds = new Set(["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"]);
        const setups = result.setups ?? [];
        const byAsset = setups.reduce<Record<string, number>>((acc, s) => {
          const key = s.assetId ?? s.symbol ?? "unknown";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        const goldCount = setups.filter((s) => goldIds.has((s.assetId ?? s.symbol ?? "").toUpperCase())).length;
        goldSetupsTotal += goldCount;
        console.log("[backfill-swing-debug]", {
          snapshot: snapshotTime.toISOString(),
          label,
          assetsUsed: Array.from(new Set(setups.map((s) => s.assetId ?? s.symbol))).slice(0, 20),
          setupsBuiltTotal: setups.length,
          setupsBuiltByAsset: Object.entries(byAsset)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
          goldSetups: goldCount,
        });
      }
    }
  }

  await createAuditRun({
    action: "snapshot_build_swing_backfill",
    source: "cron",
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "swing_backfill",
    meta: {
      built,
      skipped,
      rebuiltCount: rebuilt,
      updatedCount: rebuilt,
      forced: force,
      days,
      limit,
      dryRun,
      assetId: assetParam,
      recentFirst,
    },
  });

  return respondOk({ built, skipped, rebuilt, ...(debug ? { goldSetupsTotal } : {}) });
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
