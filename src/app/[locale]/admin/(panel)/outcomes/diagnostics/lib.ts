import path from "node:path";
import { readFile } from "node:fs/promises";
import { OutcomeReportSchema } from "../../playbooks/schema";
import { JoinStatsSchema, type JoinStats, type OutcomeReport } from "./schema";

type LoadOutcomeResult = { report: OutcomeReport; filename: string } | null;
type LoadJoinResult = { join: JoinStats; filename: string } | null;

export async function loadLatestOutcomeReport(): Promise<LoadOutcomeResult> {
  const base = path.join(process.cwd(), "artifacts", "phase1");
  const candidates = [
    "swing-outcome-analysis-latest-v2.json",
    "swing-outcome-analysis-latest-v1.json",
  ].map((file) => path.join(base, file));

  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf-8");
      const parsed = OutcomeReportSchema.parse(JSON.parse(raw));
      return { report: parsed, filename: path.basename(file) };
    } catch {
      // try next
    }
  }
  return null;
}

export async function loadLatestJoinStats(): Promise<LoadJoinResult> {
  const base = path.join(process.cwd(), "artifacts", "phase1");
  const candidates = [
    path.join(base, "join-stats-latest-v1.json"),
    // fallback: pick the newest join-stats-*.json if latest is missing
    ...(await listJoinStatFiles(base)),
  ];

  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf-8");
      const parsed = JoinStatsSchema.parse(JSON.parse(raw));
      return { join: parsed, filename: path.basename(file) };
    } catch {
      // try next
    }
  }
  return null;
}

async function listJoinStatFiles(base: string): Promise<string[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(base);
    return files
      .filter((f) => f.startsWith("join-stats-") && f.endsWith(".json"))
      .map((f) => path.join(base, f))
      .sort()
      .reverse();
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
