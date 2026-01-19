import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, gte } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { recomputeDecisionsInSetups } from "@/src/server/admin/recomputeDecisions";
import type { Setup } from "@/src/lib/engine/types";

const CRON_SECRET = process.env.CRON_SECRET;
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (ADMIN_TOKEN && bearer === ADMIN_TOKEN) return true;
  if (!CRON_SECRET) return false;
  return bearer === CRON_SECRET;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const url = new URL(request.url);
  const assetId = (url.searchParams.get("assetId") ?? "spx").toLowerCase();
  const timeframe = (url.searchParams.get("timeframe") ?? "1D").toUpperCase();
  const days = Number.parseInt(url.searchParams.get("days") ?? "30", 10);
  const label = url.searchParams.get("label") ?? "swing";
  const effectiveDays = Number.isFinite(days) && days > 0 ? days : 30;
  const from = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  const snapshots = await db
    .select()
    .from(perceptionSnapshots)
    .where(gte(perceptionSnapshots.snapshotTime, from))
    .orderBy(perceptionSnapshots.snapshotTime);

  let snapshotsConsidered = 0;
  let snapshotsUpdated = 0;
  let setupsConsidered = 0;
  let setupsUpdated = 0;
  const decisionDistribution: Record<string, number> = {};
  const updatedIds: string[] = [];

  for (const snapshot of snapshots) {
    const isMatchingLabel = !label || (snapshot.label ?? "").toLowerCase() === label.toLowerCase();
    if (!isMatchingLabel) continue;
    const setups = (snapshot.setups ?? []) as Array<Setup & Record<string, unknown>>;
    if (!setups.length) continue;
    const result = recomputeDecisionsInSetups(setups, { assetId, timeframe });
    if (!result.consideredCount) continue;
    snapshotsConsidered += 1;
    setupsConsidered += result.consideredCount;
    Object.entries(result.decisionDistribution).forEach(([k, v]) => {
      decisionDistribution[k] = (decisionDistribution[k] ?? 0) + v;
    });
    updatedIds.push(...result.updatedIds);
    if (result.changed) {
      snapshotsUpdated += 1;
      setupsUpdated += result.updatedCount;
      await db
        .update(perceptionSnapshots)
        .set({ setups: result.setups })
        .where(eq(perceptionSnapshots.id, snapshot.id));
    }
  }

  return respondOk({
    ok: true,
    meta: {
      assetId,
      timeframe,
      days: effectiveDays,
      from: from.toISOString(),
      snapshotsConsidered,
      snapshotsUpdated,
      setupsConsidered,
      setupsUpdated,
      decisionDistribution,
      updatedIds: process.env.NODE_ENV === "production" ? undefined : updatedIds.slice(0, 5),
      postCheck: await buildPostCheck({ assetId, timeframe, from, label }),
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return respondFail("METHOD_NOT_ALLOWED", "Use POST for recompute-decisions", 405);
}

type PostCheckParams = {
  assetId: string;
  timeframe: string;
  from: Date;
  label: string | null;
};

async function buildPostCheck(params: PostCheckParams) {
  const snapshots = await db
    .select()
    .from(perceptionSnapshots)
    .where(gte(perceptionSnapshots.snapshotTime, params.from))
    .orderBy(perceptionSnapshots.snapshotTime);

  let setupsInWindow = 0;
  let stillNoDefaultAlignment = 0;
  let stillBlocked = 0;
  let watch = 0;
  const blockedReasons: Record<string, number> = {};

  for (const snapshot of snapshots) {
    const isMatchingLabel = !params.label || (snapshot.label ?? "").toLowerCase() === params.label.toLowerCase();
    if (!isMatchingLabel) continue;
    const setups = (snapshot.setups ?? []) as Array<Setup & Record<string, unknown>>;
    for (const setup of setups) {
      const assetMatch = (setup.assetId ?? "").toLowerCase() === params.assetId.toLowerCase();
      const tf = ((setup.timeframeUsed ?? setup.timeframe ?? "") as string).toUpperCase();
      if (!assetMatch || tf !== params.timeframe) continue;
      setupsInWindow += 1;
      const decisionResult = deriveSetupDecision(setup);
      if ((setup.noTradeReason ?? "").toLowerCase().includes("alignment")) {
        stillNoDefaultAlignment += 1;
      }
      if (decisionResult.decision === "BLOCKED") {
        stillBlocked += 1;
        const reason =
          setup.noTradeReason ??
          decisionResult.reasons[0] ??
          (setup as { gradeDebugReason?: string | null }).gradeDebugReason ??
          "unknown";
        blockedReasons[reason] = (blockedReasons[reason] ?? 0) + 1;
      }
      if (decisionResult.decision === "WATCH") {
        watch += 1;
      }
    }
  }

  return {
    setupsInWindow,
    stillNoDefaultAlignment,
    stillBlocked,
    watch,
    blockedReasonsTop: Object.fromEntries(
      Object.entries(blockedReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    ),
  };
}
