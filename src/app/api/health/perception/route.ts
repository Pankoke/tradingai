import { NextResponse } from "next/server";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";

type PerceptionHealthStatus = {
  ok: boolean;
  status: "ok" | "warn" | "error";
  latestSnapshotTime?: string | null;
  snapshotAgeMinutes?: number | null;
  itemCount?: number | null;
  allBiasNeutral?: boolean | null;
  warnings: string[];
};

function minutesBetween(a: Date, b: Date): number {
  const diffMs = a.getTime() - b.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

function determineStatus(ageMinutes: number | null, allBiasNeutral: boolean | null, hasSnapshot: boolean): {
  status: PerceptionHealthStatus["status"];
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!hasSnapshot) {
    warnings.push("No snapshot found");
    return { status: "error", warnings };
  }

  if (ageMinutes !== null && ageMinutes > 24 * 60) {
    warnings.push("Latest snapshot is older than 24h");
    return { status: "error", warnings };
  }

  if (ageMinutes !== null && ageMinutes > 6 * 60) {
    warnings.push("Latest snapshot is older than 6h");
  }

  if (allBiasNeutral === true) {
    warnings.push("All bias scores are neutral (50) – check bias pipeline");
  }

  if (warnings.length === 0) {
    return { status: "ok", warnings };
  }

  const hasError = warnings.some((w) => w.includes("older than 24h") || w.includes("No snapshot"));
  return { status: hasError ? "error" : "warn", warnings };
}

export async function GET(): Promise<NextResponse<PerceptionHealthStatus>> {
  const latest = await getLatestSnapshot();

  const now = new Date();
  const snapshotTime = latest?.snapshot.snapshotTime ?? null;
  const latestSnapshotTime = snapshotTime ? snapshotTime.toISOString() : null;
  const snapshotAgeMinutes = snapshotTime ? minutesBetween(now, snapshotTime) : null;

  const items = latest?.items ?? [];
  const itemCount = latest ? items.length : null;

  const biasValues: number[] = [];
  for (const item of items) {
    if (typeof item.biasScoreAtTime === "number") {
      biasValues.push(item.biasScoreAtTime);
    } else if (typeof item.biasScore === "number") {
      biasValues.push(item.biasScore);
    }
  }
  const allBiasNeutral =
    biasValues.length > 0 ? biasValues.every((val) => val === 50) : null;

  const { status, warnings } = determineStatus(snapshotAgeMinutes, allBiasNeutral, Boolean(latest));

  const body: PerceptionHealthStatus = {
    ok: status === "ok",
    status,
    latestSnapshotTime,
    snapshotAgeMinutes,
    itemCount,
    allBiasNeutral,
    warnings,
  };

  const httpStatus = status === "error" ? 500 : 200;
  return NextResponse.json(body, { status: httpStatus });
}
