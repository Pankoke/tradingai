import { desc, eq } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { auditRuns } from "@/src/server/db/schema/auditRuns";

export type FreshnessRun = {
  id: string;
  action: string;
  timestamp: Date;
  ok: boolean;
  source: string;
  durationMs?: number | null;
  message?: string | null;
  error?: string | null;
  gate: string | null;
  freshnessStatus: string;
  skippedCount: number;
  checkedTimeframes: string[];
  thresholdsMinutes: Record<string, number | undefined> | null;
  meta: Record<string, unknown> | null;
  reasonsPreview: Array<{ assetId?: string; timeframe?: string; status?: string; ageMinutes?: number | null }>;
};

function parseFreshness(meta: unknown): {
  gate: string | null;
  freshnessStatus: string;
  skippedCount: number;
  checkedTimeframes: string[];
  thresholdsMinutes: Record<string, number | undefined> | null;
  reasonsPreview: FreshnessRun["reasonsPreview"];
} {
  if (!meta || typeof meta !== "object") {
    return {
      gate: null,
      freshnessStatus: "no_meta",
      skippedCount: 0,
      checkedTimeframes: [],
      thresholdsMinutes: null,
      reasonsPreview: [],
    };
  }
  const m = meta as Record<string, unknown>;
  const freshness = (m.freshness ?? {}) as Record<string, unknown>;
  const gate = typeof freshness.gate === "string" ? freshness.gate : null;
  const status = typeof freshness.status === "string" ? freshness.status : "no_meta";
  const skippedAssets = Array.isArray(freshness.skippedAssets) ? freshness.skippedAssets : [];
  const skippedCount = skippedAssets.length;
  const checkedTimeframes = Array.isArray(freshness.checkedTimeframes)
    ? freshness.checkedTimeframes.filter((v): v is string => typeof v === "string")
    : [];
  const thresholdsMinutes =
    freshness.thresholdsMinutes && typeof freshness.thresholdsMinutes === "object"
      ? (freshness.thresholdsMinutes as Record<string, number | undefined>)
      : null;
  const reasonsPreview = skippedAssets.slice(0, 3).map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      assetId: typeof e.assetId === "string" ? e.assetId : undefined,
      timeframe: typeof e.timeframe === "string" ? e.timeframe : undefined,
      status: typeof e.status === "string" ? e.status : undefined,
      ageMinutes: typeof e.ageMinutes === "number" ? e.ageMinutes : undefined,
    };
  });
  return { gate, freshnessStatus: status, skippedCount, checkedTimeframes, thresholdsMinutes, reasonsPreview };
}

export async function getLatestFreshnessRuns(params: {
  actions: string[];
  limitPerAction?: number;
}): Promise<FreshnessRun[]> {
  const limit = Math.max(1, Math.min(10, params.limitPerAction ?? 1));
  const results: FreshnessRun[] = [];
  for (const action of params.actions) {
    const rows = await db
      .select()
      .from(auditRuns)
      .where(eq(auditRuns.action, action))
      .orderBy(desc(auditRuns.createdAt))
      .limit(limit);
    for (const row of rows) {
      const freshness = parseFreshness(row.meta ?? {});
      results.push({
        id: row.id,
        action: row.action,
        timestamp: row.createdAt,
        ok: row.ok,
        source: row.source,
        durationMs: row.durationMs,
        message: row.message,
        error: row.error,
        gate: freshness.gate ?? null,
        freshnessStatus: freshness.freshnessStatus,
        skippedCount: freshness.skippedCount ?? 0,
        checkedTimeframes: freshness.checkedTimeframes ?? [],
        thresholdsMinutes: freshness.thresholdsMinutes ?? null,
        meta: (row.meta as Record<string, unknown> | null) ?? null,
        reasonsPreview: freshness.reasonsPreview,
      });
    }
  }
  return results;
}

export async function getFreshnessRuns(params: {
  hasFreshnessOnly?: boolean;
  action?: string;
  gate?: string;
  limit?: number;
}): Promise<FreshnessRun[]> {
  const limit = Math.max(1, Math.min(200, params.limit ?? 50));
  const rows = await db
    .select()
    .from(auditRuns)
    .orderBy(desc(auditRuns.createdAt))
    .limit(limit * 3); // oversample to keep matches after filtering

  const mapped: FreshnessRun[] = rows.map((row) => {
    const freshness = parseFreshness(row.meta ?? {});
    return {
      id: row.id,
      action: row.action,
      timestamp: row.createdAt,
      ok: row.ok,
      source: row.source,
      durationMs: row.durationMs,
      message: row.message,
      error: row.error,
      gate: freshness.gate ?? null,
      freshnessStatus: freshness.freshnessStatus,
      skippedCount: freshness.skippedCount ?? 0,
      checkedTimeframes: freshness.checkedTimeframes ?? [],
      thresholdsMinutes: freshness.thresholdsMinutes ?? null,
      meta: (row.meta as Record<string, unknown> | null) ?? null,
      reasonsPreview: freshness.reasonsPreview,
    };
  });

  const filtered = mapped.filter((run) => {
    if (params.hasFreshnessOnly && !run.gate) return false;
    if (params.action && run.action !== params.action) return false;
    if (params.gate && run.gate !== params.gate) return false;
    return true;
  });

  return filtered.slice(0, limit);
}
