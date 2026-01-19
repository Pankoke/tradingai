import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { recomputeDecisionsInSetups } from "@/src/server/admin/recomputeDecisions";
import type { Setup } from "@/src/lib/engine/types";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): { ok: boolean; debug?: Record<string, unknown> } {
  const cronSecret = process.env.CRON_SECRET;
  const adminToken = process.env.ADMIN_API_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  const usedAdmin = !!adminToken && bearer === adminToken;
  const usedCron = !!cronSecret && bearer === cronSecret;
  if (usedAdmin || usedCron) return { ok: true };

  if (process.env.NODE_ENV !== "production") {
    return {
      ok: false,
      debug: {
        hasCronSecret: Boolean(cronSecret),
        hasAdminToken: Boolean(adminToken),
        cronSecretLen: cronSecret?.length ?? 0,
        adminTokenLen: adminToken?.length ?? 0,
        authHeaderPresent: header.length > 0,
        bearerPresent: Boolean(bearer),
        bearerLen: bearer?.length ?? 0,
      },
    };
  }

  return { ok: false };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    const headers = new Headers();
    headers.set("x-recompute-route", "hit");
    if (process.env.NODE_ENV !== "production" && auth.debug) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
          debug: auth.debug,
        },
        { status: 401, headers },
      );
    }
    const res = respondFail("UNAUTHORIZED", "Unauthorized", 401);
    res.headers.set("x-recompute-route", "hit");
    return res;
  }

  const url = new URL(request.url);
  const assetId = (url.searchParams.get("assetId") ?? "spx").toLowerCase();
  const timeframe = (url.searchParams.get("timeframe") ?? "1D").toUpperCase();
  const days = Number.parseInt(url.searchParams.get("days") ?? "30", 10);
  const label = url.searchParams.get("label") ?? "swing";
  const labelLower = label?.toLowerCase() ?? "";
  const labelIsNull = labelLower === "(null)" || labelLower === "__null__";
  const effectiveDays = Number.isFinite(days) && days > 0 ? days : 30;
  const from = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  const totalSnapshotsRow = await db.select({ value: sql<number>`count(*)` }).from(perceptionSnapshots);
  const totalSnapshotsInTable = totalSnapshotsRow[0]?.value ?? 0;

  const snapshotsBySnapshotTimeRow = await db
    .select({ value: sql<number>`count(*)` })
    .from(perceptionSnapshots)
    .where(gte(perceptionSnapshots.snapshotTime, from));
  const snapshotsInWindowBySnapshotTime = snapshotsBySnapshotTimeRow[0]?.value ?? 0;

  const snapshotsByCreatedAtRow = await db
    .select({ value: sql<number>`count(*)` })
    .from(perceptionSnapshots)
    .where(gte(perceptionSnapshots.createdAt, from));
  const snapshotsInWindowByCreatedAt = snapshotsByCreatedAtRow[0]?.value ?? 0;

  let minSnapshotTime: Date | null = null;
  let maxSnapshotTime: Date | null = null;
  if (process.env.NODE_ENV !== "production") {
    const minMaxRows = await db
      .select({
        min: sql<Date | null>`min(${perceptionSnapshots.snapshotTime})`,
        max: sql<Date | null>`max(${perceptionSnapshots.snapshotTime})`,
      })
      .from(perceptionSnapshots);
    minSnapshotTime = minMaxRows[0]?.min ?? null;
    maxSnapshotTime = minMaxRows[0]?.max ?? null;
  }

  const snapshots = await db
    .select()
    .from(perceptionSnapshots)
    .where(or(gte(perceptionSnapshots.snapshotTime, from), gte(perceptionSnapshots.createdAt, from)))
    .orderBy(perceptionSnapshots.snapshotTime);

  let snapshotsConsidered = 0;
  let snapshotsUpdated = 0;
  let setupsConsidered = 0;
  let setupsUpdated = 0;
  const decisionDistribution: Record<string, number> = {};
  const updatedIds: string[] = [];
  const sampleSetups: Array<Record<string, unknown>> = [];

  const labelCounts: Record<string, number> = {};
  for (const snapshot of snapshots) {
    const key = ((snapshot.label ?? "(null)") as string).toLowerCase();
    if (key) {
      labelCounts[key] = (labelCounts[key] ?? 0) + 1;
    }
    const isMatchingLabel = labelIsNull
      ? !snapshot.label
      : !labelLower || (snapshot.label ?? "").toLowerCase().includes(labelLower);
    if (!isMatchingLabel) continue;
    const setups = (snapshot.setups ?? []) as Array<Setup & Record<string, unknown>>;
    if (!setups.length) continue;
    const result = recomputeDecisionsInSetups(setups, { assetId, timeframe });
    if (!result.consideredCount) continue;
    if (process.env.NODE_ENV !== "production" && sampleSetups.length < 3) {
      const relevant = setups.filter(
        (s) =>
          (s.assetId ?? "").toLowerCase() === assetId.toLowerCase() &&
          ((s.timeframeUsed ?? s.timeframe ?? "") as string).toUpperCase() === timeframe,
      );
      for (const s of relevant) {
        if (sampleSetups.length >= 3) break;
        sampleSetups.push({
          id: (s as { id?: string }).id,
          label: snapshot.label,
          assetId: s.assetId,
          timeframe: (s.timeframeUsed ?? s.timeframe) ?? null,
          direction: (s as { direction?: unknown }).direction,
          biasScore: (s as { biasScore?: unknown }).biasScore,
          trendScore: (s as { trendScore?: unknown }).trendScore,
          noTradeReason: (s as { noTradeReason?: unknown }).noTradeReason,
          gradeDebugReason: (s as { gradeDebugReason?: unknown }).gradeDebugReason,
          setupDecision: (s as { setupDecision?: unknown }).setupDecision,
          setupGrade: (s as { setupGrade?: unknown }).setupGrade,
          decisionReasons: (s as { decisionReasons?: unknown }).decisionReasons,
          keys: Object.keys(s),
        });
      }
    }
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

  const headers = new Headers([["x-recompute-route", "hit"]]);
  return NextResponse.json(
    {
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
        postCheck: await buildPostCheck({ assetId, timeframe, from, label, labelIsNull }),
        labelsInWindowTop: Object.fromEntries(
          Object.entries(labelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
        ),
        totalSnapshotsInTable,
        snapshotsInWindowBySnapshotTime,
        snapshotsInWindowByCreatedAt,
        minMaxSnapshotTime:
          process.env.NODE_ENV !== "production"
            ? {
                min: toIsoOrNull(minSnapshotTime),
                max: toIsoOrNull(maxSnapshotTime),
              }
            : undefined,
        sampleSetups: process.env.NODE_ENV !== "production" ? sampleSetups : undefined,
      },
    },
    { status: 200, headers },
  );
}

export async function GET(): Promise<NextResponse> {
  return respondFail("METHOD_NOT_ALLOWED", "Use POST for recompute-decisions", 405);
}

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

type PostCheckParams = {
  assetId: string;
  timeframe: string;
  from: Date;
  label: string | null;
  labelIsNull?: boolean;
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
    const labelLower = params.label?.toLowerCase() ?? "";
    const isMatchingLabel = params.labelIsNull
      ? !snapshot.label
      : !labelLower || (snapshot.label ?? "").toLowerCase() === labelLower;
    if (!isMatchingLabel) continue;
    const setups = (snapshot.setups ?? []) as Array<Setup & Record<string, unknown>>;
    for (const setup of setups) {
      const assetMatch = (setup.assetId ?? "").toLowerCase() === params.assetId.toLowerCase();
      const tf = ((setup.timeframeUsed ?? setup.timeframe ?? "") as string).toUpperCase();
      if (!assetMatch || tf !== params.timeframe) continue;
      setupsInWindow += 1;
      const decisionResult = deriveSetupDecision(setup);
      const reasonTexts = [
        setup.noTradeReason ?? "",
        ...(Array.isArray((setup as { decisionReasons?: unknown }).decisionReasons)
          ? ((setup as { decisionReasons?: unknown }).decisionReasons as string[])
          : []),
      ]
        .filter(Boolean)
        .map((r) => r.toLowerCase());
      if (reasonTexts.some((r) => r.includes("no default alignment"))) {
        stillNoDefaultAlignment += 1;
      }
      if (decisionResult.decision === "BLOCKED") {
        stillBlocked += 1;
        const reason =
          setup.noTradeReason ??
          decisionResult.reasons[0] ??
          (setup as { gradeDebugReason?: string | null }).gradeDebugReason ??
          "Blocked (unspecified)";
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
