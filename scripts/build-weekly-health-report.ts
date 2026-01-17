import { promises as fs } from "fs";
import { resolve } from "path";

type Distribution = { total: number; [key: string]: { count: number; pct: number } | number };
type OutcomeBucket = { hit_tp?: number; hit_sl?: number; open?: number; expired?: number; ambiguous?: number; evaluatedCount?: number; winRateTpVsSl?: number };
type BiasBucket = { total: number; byGrade: Record<"A" | "B" | "NO_TRADE", number>; noTradeReasons: Record<string, number> };
type WatchSegment = {
  count: number;
  pct: number;
  avgBias: number | null;
  avgTrend: number | null;
  avgSignalQuality: number | null;
  avgConfidence: number | null;
};
type WatchUpgradeCandidates = {
  definition: Record<string, unknown>;
  totalWatchFailsTrend: number;
  candidatesCount: number;
  candidatesPctOfWatchFailsTrend: number;
  avgBias: number | null;
  avgTrend: number | null;
  avgSignalQuality: number | null;
  avgConfidence: number | null;
};

type Phase0Payload = {
  meta?: { assetId?: string; profile?: string; timeframe?: string; daysBack?: number };
  decisionDistribution?: Distribution;
  gradeDistribution?: Distribution;
  outcomesByDecision?: Record<"TRADE" | "WATCH" | "BLOCKED", OutcomeBucket>;
  outcomesByWatchSegment?: Record<string, OutcomeBucket> | null;
  outcomesByWatchUpgradeCandidate?: OutcomeBucket | null;
  outcomesByBtcTradeRrrBucket?: Record<string, OutcomeBucket> | null;
  watchToTradeProxy?: { count: number; total: number; pct: number } | null;
  debugMeta?: {
    biasHistogram?: Record<string, BiasBucket>;
    cohortTimeRange?: { snapshotTimeMin?: string | null; snapshotTimeMax?: string | null };
    watchSegments?: Record<string, WatchSegment> | null;
    watchUpgradeCandidates?: WatchUpgradeCandidates | null;
    btcAlignmentBreakdown?: { total: number; top: { reason: string; count: number; pct: number }[] } | null;
    btcLevelPlausibility?: {
      count: number;
      parseErrors: number;
      avgStopPct: number | null;
      p50StopPct: number | null;
      p90StopPct: number | null;
      avgTargetPct: number | null;
      p50TargetPct: number | null;
      p90TargetPct: number | null;
      avgRRR: number | null;
    } | null;
  };
};

type Phase0Response = { ok: true; data: Phase0Payload } | { ok: false; error: unknown };

async function loadJson(path: string): Promise<Phase0Payload> {
  const raw = await fs.readFile(path, "utf-8");
  let parsed: Phase0Response;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON at ${path}: ${(err as Error).message}`);
  }
  if (!parsed || parsed.ok !== true || !parsed.data) {
    const details = (parsed as { error?: unknown })?.error ?? "unknown";
    throw new Error(`Invalid Phase0 JSON at ${path}: ${JSON.stringify(details)}`);
  }
  return parsed.data;
}

function formatPct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function renderDistribution(title: string, dist?: Distribution): string {
  if (!dist || typeof dist.total !== "number") return `${title}: n/a\n`;
  const lines = Object.entries(dist)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => {
      const val = v as { count: number; pct: number };
      return `- ${k}: ${val.count ?? 0} (${val.pct ?? 0}%)`;
    });
  return [`### ${title}`, ...lines, ""].join("\n");
}

function renderOutcomes(title: string, bucket?: OutcomeBucket): string {
  if (!bucket) return `### ${title}\n- n/a\n`;
  const evaluated = bucket.evaluatedCount ?? ((bucket.hit_tp ?? 0) + (bucket.hit_sl ?? 0));
  return [
    `### ${title}`,
    `- hit_tp: ${bucket.hit_tp ?? 0}`,
    `- hit_sl: ${bucket.hit_sl ?? 0}`,
    `- open: ${bucket.open ?? 0}`,
    `- expired: ${bucket.expired ?? 0}`,
    `- ambiguous: ${bucket.ambiguous ?? 0}`,
    `- evaluatedCount: ${evaluated}`,
    `- winRateTpVsSl: ${formatPct(bucket.winRateTpVsSl ?? (evaluated > 0 ? (bucket.hit_tp ?? 0) / evaluated : 0))}`,
    "",
  ].join("\n");
}

function renderBiasHistogram(biasHistogram?: Record<string, BiasBucket>): string {
  if (!biasHistogram) return "### Bias Histogram\n- n/a\n";
  const sections = Object.entries(biasHistogram).map(([bucket, data]) => {
    const topReasons = Object.entries(data.noTradeReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(" | ") || "n/a";
    return [
      `#### ${bucket}`,
      `- total: ${data.total}`,
      `- byGrade: A=${data.byGrade.A} B=${data.byGrade.B} NO_TRADE=${data.byGrade.NO_TRADE}`,
      `- top noTradeReasons: ${topReasons}`,
      "",
    ].join("\n");
  });
  return ["### Bias Histogram", ...sections].join("\n");
}

function renderWatchProxy(proxy?: { count: number; total: number; pct: number } | null): string {
  if (!proxy) return "";
  return `### Watch→Trade Proxy\n- hits: ${proxy.count}/${proxy.total} (${formatPct(proxy.pct / 100)})\n`;
}

function buildAlerts(data: Phase0Payload): string[] {
  const alerts: string[] = [];
  const dist = data.decisionDistribution;
  if (dist && typeof dist.total === "number" && dist.total > 0) {
    const trade = (dist.TRADE as { count?: number })?.count ?? 0;
    const tradePct = (dist.TRADE as { pct?: number })?.pct ?? 0;
    if (tradePct < 10) alerts.push(`TRADE Anteil niedrig: ${trade}/${dist.total} (${tradePct}%)`);
  }
  const watchBucket = data.outcomesByDecision?.WATCH;
  if (watchBucket) {
    const evalCount = watchBucket.evaluatedCount ?? ((watchBucket.hit_tp ?? 0) + (watchBucket.hit_sl ?? 0));
    const winRate = evalCount > 0 ? (watchBucket.hit_tp ?? 0) / evalCount : 0;
    if (evalCount >= 5 && winRate < 0.5) {
      alerts.push(`WATCH Winrate niedrig: ${formatPct(winRate)} bei ${evalCount} evaluierten`);
    }
  }
  return alerts;
}

function renderWatchSegments(segments?: Record<string, WatchSegment> | null, outcomes?: Record<string, OutcomeBucket> | null): string {
  if (!segments) return "";
  const lines: string[] = ["### WATCH Segments (Gold)"];
  for (const [key, seg] of Object.entries(segments)) {
    const outcome = outcomes?.[key];
    const evaluated = outcome ? outcome.evaluatedCount ?? ((outcome.hit_tp ?? 0) + (outcome.hit_sl ?? 0)) : 0;
    const winRate = outcome ? outcome.winRateTpVsSl ?? 0 : 0;
    lines.push(
      `- ${key}: ${seg.count} (${seg.pct}%) | avg bias ${seg.avgBias ?? "n/a"} | trend ${seg.avgTrend ?? "n/a"} | SQ ${seg.avgSignalQuality ?? "n/a"} | conf ${seg.avgConfidence ?? "n/a"}` +
        (outcomes ? ` | outcomes eval=${evaluated} winRate=${formatPct(winRate)}` : ""),
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderAssetSection(label: string, data: Phase0Payload): string {
  const meta = data.meta ?? {};
  const cohort = data.debugMeta?.cohortTimeRange;
  const alerts = buildAlerts(data);
  const isGold = (meta.assetId ?? "").toLowerCase() === "gold";
  const upgrade = isGold ? data.debugMeta?.watchUpgradeCandidates : null;
  const isBtc = (meta.assetId ?? "").toLowerCase() === "btc";
  const btcAlignment = data.debugMeta?.btcAlignmentBreakdown;
  const btcLevels = data.debugMeta?.btcLevelPlausibility;
  const btcRrr = data.outcomesByBtcTradeRrrBucket;

  const lines = [
    `## ${label}`,
    `- Meta: asset=${meta.assetId ?? "n/a"} profile=${meta.profile ?? "n/a"} tf=${meta.timeframe ?? "n/a"} daysBack=${
      meta.daysBack ?? "n/a"
    }`,
    `- Cohort: ${cohort?.snapshotTimeMin ?? "n/a"} .. ${cohort?.snapshotTimeMax ?? "n/a"}`,
    alerts.length ? `- Alerts: ${alerts.join(" | ")}` : "- Alerts: none",
    "",
    renderDistribution("Decision Distribution", data.decisionDistribution),
    renderDistribution("Grade Distribution", data.gradeDistribution),
    renderOutcomes("Outcomes TRADE", data.outcomesByDecision?.TRADE),
    renderOutcomes("Outcomes WATCH", data.outcomesByDecision?.WATCH),
    renderOutcomes("Outcomes BLOCKED", data.outcomesByDecision?.BLOCKED),
    renderWatchProxy(data.watchToTradeProxy ?? null),
    isGold ? renderWatchSegments(data.debugMeta?.watchSegments ?? null, data.outcomesByWatchSegment ?? null) : "",
    isGold && upgrade
      ? [
          "### Upgrade Candidate (WATCH_FAILS_TREND filtered)",
          `- total WATCH_FAILS_TREND: ${upgrade.totalWatchFailsTrend}`,
          `- candidates: ${upgrade.candidatesCount} (${upgrade.candidatesPctOfWatchFailsTrend}%)`,
          `- avg bias ${upgrade.avgBias ?? "n/a"} | trend ${upgrade.avgTrend ?? "n/a"} | SQ ${upgrade.avgSignalQuality ?? "n/a"} | conf ${upgrade.avgConfidence ?? "n/a"}`,
          data.outcomesByWatchUpgradeCandidate
            ? `- outcomes: eval=${data.outcomesByWatchUpgradeCandidate.evaluatedCount ?? 0} winRate=${formatPct(
                data.outcomesByWatchUpgradeCandidate.winRateTpVsSl ?? 0,
              )}`
            : "- outcomes: n/a",
          "",
        ].join("\n")
      : "",
    isBtc && btcAlignment
      ? [
          "### Alignment / NO_TRADE reasons (BTC)",
          ...btcAlignment.top.map((item) => `- ${item.reason}: ${item.count} (${item.pct}%)`),
          "",
        ].join("\n")
      : "",
    isBtc && btcLevels
      ? [
          "### TRADE Level Plausibility (BTC)",
          `- count: ${btcLevels.count}, parseErrors: ${btcLevels.parseErrors}`,
          `- stop pct avg=${btcLevels.avgStopPct ?? "n/a"} p50=${btcLevels.p50StopPct ?? "n/a"} p90=${btcLevels.p90StopPct ?? "n/a"}`,
          `- target pct avg=${btcLevels.avgTargetPct ?? "n/a"} p50=${btcLevels.p50TargetPct ?? "n/a"} p90=${btcLevels.p90TargetPct ?? "n/a"}`,
          `- avg RRR: ${btcLevels.avgRRR ?? "n/a"}`,
          "",
        ].join("\n")
      : "",
    isBtc && btcRrr
      ? [
          "### RRR Buckets (BTC TRADE Outcomes)",
          ...Object.entries(btcRrr).map(
            ([bucket, v]) =>
              `- ${bucket}: hit_tp=${v.hit_tp ?? 0} hit_sl=${v.hit_sl ?? 0} open=${v.open ?? 0} eval=${v.evaluatedCount ?? 0} winRate=${formatPct(
                v.winRateTpVsSl ?? 0,
              )}`,
          ),
          "",
        ].join("\n")
      : "",
    renderBiasHistogram(data.debugMeta?.biasHistogram),
  ];
  return lines.join("\n");
}

async function main() {
  const gold = await loadJson("phase0_gold.json");
  const btc = await loadJson("phase0_btc.json");

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const stamp = `${dateStr}_${hh}-${mm}-${ss}`;

  const reportLines = [
    `# Weekly Health Report (${dateStr})`,
    `Generated at ${now.toISOString()}`,
    "",
    "## Alerts (global)",
  ];

  const globalAlerts = [...buildAlerts(gold), ...buildAlerts(btc)];
  if (globalAlerts.length) {
    globalAlerts.forEach((a) => reportLines.push(`- ${a}`));
  } else {
    reportLines.push("- none");
  }
  reportLines.push("");
  reportLines.push(renderAssetSection("Gold Swing", gold));
  reportLines.push(renderAssetSection("BTC Swing", btc));

  const outputDir = resolve(process.cwd(), "reports", "weekly");
  const fileName = `${stamp}.md`;
  const outPath = resolve(outputDir, fileName);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outPath, reportLines.join("\n"), "utf-8");
  const written = await fs.stat(outPath).catch(() => null);
  if (!written || !written.isFile()) {
    throw new Error(`Report was not written to ${outPath}`);
  }
  // eslint-disable-next-line no-console
  console.log(`REPORT_FILE=${fileName}`);
  // eslint-disable-next-line no-console
  console.log(`Report written to ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
