import path from "node:path";
import { OutcomeReportSchema } from "../../playbooks/schema";
import { JoinStatsSchema, type JoinStats, type OutcomeReport } from "./schema";
import { buildPhase1Candidates, loadPhase1Artifact } from "@/lib/artifacts/storage";

type LoadOutcomeResult = { report: OutcomeReport; filename: string; source: string } | null;
type LoadJoinResult = { join: JoinStats; filename: string; source: string } | null;

export async function loadLatestOutcomeReport(): Promise<LoadOutcomeResult> {
  const candidates = buildPhase1Candidates("swing-outcome-analysis");
  const loaded = await loadPhase1Artifact(candidates, (value) => OutcomeReportSchema.parse(normalizeOpenCounts(value)));
  if (!loaded) return null;
  return { report: loaded.data, filename: loaded.location, source: loaded.source };
}

export async function loadLatestJoinStats(): Promise<LoadJoinResult> {
  const baseCandidates = buildPhase1Candidates("join-stats");
  // allow fallback to any dated join-stats-*.json when latest keys missing
  const fsDir = path.join(process.cwd(), "artifacts", "phase1");
  const datedFs: { fsPath: string }[] = await listJoinStatFiles(fsDir);
  const candidates = [...baseCandidates, ...datedFs];

  const loaded = await loadPhase1Artifact(candidates, (value) => JoinStatsSchema.parse(value));
  if (!loaded) return null;
  return { join: loaded.data, filename: loaded.location, source: loaded.source };
}

function normalizeOpenCounts(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const clone = structuredClone(value) as any;
  if (clone.overall && typeof clone.overall.openCount !== "number" && typeof clone.overall.closedCount === "number" && typeof clone.overall.outcomesTotal === "number") {
    clone.overall.openCount = clone.overall.outcomesTotal - clone.overall.closedCount;
  }
  if (Array.isArray(clone.byKey)) {
    clone.byKey = clone.byKey.map((row: any) => {
      if (
        row &&
        typeof row === "object" &&
        typeof row.openCount !== "number" &&
        typeof row.closedCount === "number" &&
        typeof row.outcomesTotal === "number"
      ) {
        return { ...row, openCount: row.outcomesTotal - row.closedCount };
      }
      return row;
    });
  }
  return clone;
}

async function listJoinStatFiles(baseDir: string): Promise<{ fsPath: string }[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(baseDir);
    return files
      .filter((f) => f.startsWith("join-stats-") && f.endsWith(".json"))
      .map((f) => ({ fsPath: path.join(baseDir, f) }))
      .sort((a, b) => b.fsPath.localeCompare(a.fsPath));
  } catch {
    return [];
  }
}

export function computeStalenessMinutes(timestamp: string | undefined): number | null {
  if (!timestamp) return null;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  return diffMs < 0 ? 0 : Math.round(diffMs / 60000);
}

export function computeMissingDims(report: OutcomeReport) {
  let missingPlaybook = 0;
  let missingDecision = 0;
  let missingGrade = 0;
  for (const row of report.byKey) {
    if (!row.key.playbookId || row.key.playbookId === "unknown") missingPlaybook += row.outcomesTotal;
    if (!row.key.decision || row.key.decision === "unknown") missingDecision += row.outcomesTotal;
    if (!row.key.grade || row.key.grade === "UNKNOWN") missingGrade += row.outcomesTotal;
  }
  const fallbackUsed =
    (report as unknown as { fallbackUsedCount?: number | null }).fallbackUsedCount ?? null;
  return { missingPlaybook, missingDecision, missingGrade, fallbackUsed };
}

export function computeMostlyOpenShare(report: OutcomeReport): number | null {
  if (!report.overall) return null;
  const total = report.overall.outcomesTotal;
  if (total <= 0) return null;
  return report.overall.openCount / total;
}
