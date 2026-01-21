import "dotenv/config";

import { promises as fs } from "fs";
import { resolve } from "path";

type SummarySlice = {
  decisionDistribution?: Record<string, number>;
  gradeDistribution?: Record<string, number>;
  watchSegmentsDistribution?: Record<string, number>;
  alignmentDistribution?: Record<string, number>;
  blockedReasonsDistribution?: Record<string, number>;
  noTradeReasonsDistribution?: Record<string, number>;
  watchReasonsDistribution?: Record<string, number>;
};

type Phase0Response =
  | { ok: true; data: { summaries?: Record<string, SummarySlice> } }
  | { ok: false; error: unknown };

function topEntries(map?: Record<string, number>, limit = 5): Record<string, number> | undefined {
  if (!map) return undefined;
  return Object.fromEntries(
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit),
  );
}

async function fetchPhase0(baseUrl: string, days = 30): Promise<Phase0Response> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/admin/playbooks/phase0-gold-swing?days=${days}`;
  const headers: Record<string, string> = {};
  const token = process.env.CRON_SECRET ?? process.env.ADMIN_API_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = (await res.json()) as Phase0Response;
  return json;
}

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const days = Number.parseInt(process.argv[2] ?? "", 10);
  const windowDays = Number.isFinite(days) && days > 0 ? days : 30;
  const data = await fetchPhase0(baseUrl, windowDays);
  if (!data.ok) {
    // eslint-disable-next-line no-console
    console.error("Phase0 fetch failed", data);
    process.exit(1);
  }
  const summaries = data.data.summaries ?? {};
  const baseline: Record<string, unknown> = {
    fetchedAt: new Date().toISOString(),
    baseUrl,
    windowDays,
    summaryKeys: Object.keys(summaries),
    assets: {} as Record<string, unknown>,
  };

  for (const [asset, summary] of Object.entries(summaries)) {
    (baseline.assets as Record<string, unknown>)[asset] = {
      decisionDistribution: summary.decisionDistribution,
      gradeDistribution: summary.gradeDistribution,
      watchSegmentsDistribution: summary.watchSegmentsDistribution,
      alignmentDistribution: summary.alignmentDistribution,
      blockedReasonsTop: topEntries(summary.blockedReasonsDistribution),
      noTradeReasonsTop: topEntries(summary.noTradeReasonsDistribution),
      watchReasonsTop: topEntries(summary.watchReasonsDistribution),
    };
  }

  const dir = resolve(process.cwd(), "artifacts", "phase0-baseline");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = resolve(dir, `${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(baseline, null, 2), "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Baseline written to ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

