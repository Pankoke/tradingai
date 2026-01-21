import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type AlignmentDistribution = { LONG?: number; SHORT?: number; NEUTRAL?: number };

const fxAssets = ["eurusd", "gbpusd", "usdjpy", "eurjpy"];

function loadLatestBaseline(): Record<string, unknown> | null {
  const dir = "artifacts/phase0-baseline";
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (!files.length) return null;
  const latest = files.sort((a, b) => b.localeCompare(a))[0];
  const raw = readFileSync(join(dir, latest), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function alignmentTotal(dist: AlignmentDistribution | undefined): number {
  if (!dist) return 0;
  const vals = [dist.LONG, dist.SHORT, dist.NEUTRAL].map((v) => (Number.isFinite(v) ? Number(v) : 0));
  return vals.reduce((a, b) => a + b, 0);
}

it("FX baseline contains alignmentDistribution for all FX assets with non-zero totals", () => {
  const baseline = loadLatestBaseline();
  expect(baseline).not.toBeNull();
  const assets = (baseline?.assets ?? baseline?.data?.summaries) as Record<string, { alignmentDistribution?: AlignmentDistribution }>;
  for (const fx of fxAssets) {
    const dist = assets?.[fx]?.alignmentDistribution;
    expect(dist).toBeTruthy();
    expect(alignmentTotal(dist)).toBeGreaterThan(0);
  }
});
