import { promises as fs } from "fs";
import { resolve } from "path";
import { zPhase0Payload, type AssetPhase0Summary, type Phase0PayloadData } from "@/src/contracts/phase0Payload.schema";

type Distribution = { total: number; [key: string]: { count?: number; pct?: number } | number };
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
type BtcWatchSegment = {
  count: number;
  pct: number;
  avgBias: number | null;
  avgTrend: number | null;
  avgOrderflow: number | null;
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

async function loadJson(path: string): Promise<Phase0PayloadData> {
  const raw = await fs.readFile(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON at ${path}: ${(err as Error).message}`);
  }
  const validated = zPhase0Payload.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Phase0 contract validation failed at ${path}: ${issues}`);
  }
  if (!validated.data.ok || !validated.data.data) {
    const details = (validated.data as { error?: unknown })?.error ?? "unknown";
    throw new Error(`Invalid Phase0 JSON at ${path}: ${JSON.stringify(details)}`);
  }
  return validated.data.data;
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

function renderCountTable(title: string, entries?: Record<string, number> | Record<string, unknown>): string {
  if (!entries || Object.keys(entries).length === 0) {
    return [`### ${title}`, "- No data", ""].join("\n");
  }
  const lines = [
    `### ${title}`,
    "| Key | Count |",
    "| --- | ---: |",
    ...Object.entries(entries)
      .map(([k, v]) => [k, typeof v === "number" ? v : Number(v) || 0] as const)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
    "",
  ];
  return lines.join("\n");
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
  return `### Watch->Trade Proxy\n- hits: ${proxy.count}/${proxy.total} (${formatPct(proxy.pct / 100)})\n`;
}

function buildAlerts(data: Phase0PayloadData): string[] {
  const alerts: string[] = [];
  const dist = data.decisionDistribution;
  if (dist && typeof dist.total === "number" && dist.total > 0) {
    const trade = (dist.TRADE as { count?: number })?.count ?? 0;
    const tradePct = (dist.TRADE as { pct?: number })?.pct ?? 0;
    if (tradePct < 10) alerts.push(`TRADE Anteil niedrig: ${trade}/${dist.total} (${tradePct}%)`);
  }
  const outcomesByDecisionRaw = (data as { outcomesByDecision?: unknown }).outcomesByDecision;
  if (outcomesByDecisionRaw && typeof outcomesByDecisionRaw === "object") {
    const watchBucket = (outcomesByDecisionRaw as Record<string, unknown>).WATCH as OutcomeBucket | undefined;
    if (watchBucket) {
      const evalCount = watchBucket.evaluatedCount ?? ((watchBucket.hit_tp ?? 0) + (watchBucket.hit_sl ?? 0));
      const winRate = evalCount > 0 ? (watchBucket.hit_tp ?? 0) / evalCount : 0;
      if (evalCount >= 5 && winRate < 0.5) {
        alerts.push(`WATCH Winrate niedrig: ${formatPct(winRate)} bei ${evalCount} evaluierten`);
      }
    }
  }
  return alerts;
}

function getOutcomesByDecision(data: Phase0PayloadData): Record<string, OutcomeBucket> | undefined {
  const raw = (data as { outcomesByDecision?: unknown }).outcomesByDecision;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as Record<string, OutcomeBucket>;
}

function getOutcomesByWatchSegment(data: Phase0PayloadData): Record<string, OutcomeBucket> | null {
  const raw = (data as { outcomesByWatchSegment?: unknown }).outcomesByWatchSegment;
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, OutcomeBucket>;
}

function getWatchSegments(data: Phase0PayloadData): Record<string, WatchSegment> | null {
  const raw = (data as { debugMeta?: unknown }).debugMeta;
  if (!raw || typeof raw !== "object") return null;
  const segments = (raw as { watchSegments?: unknown }).watchSegments;
  if (!segments || typeof segments !== "object") return null;
  return segments as Record<string, WatchSegment>;
}

function getBtcWatchSegments(data: Phase0PayloadData): Record<string, BtcWatchSegment> | null {
  const raw = (data as { debugMeta?: unknown }).debugMeta;
  if (!raw || typeof raw !== "object") return null;
  const segments = (raw as { btcWatchSegments?: unknown }).btcWatchSegments;
  if (!segments || typeof segments !== "object") return null;
  return segments as Record<string, BtcWatchSegment>;
}

function getBiasHistogram(data: Phase0PayloadData): Record<string, BiasBucket> | undefined {
  const raw = (data as { debugMeta?: unknown }).debugMeta;
  if (!raw || typeof raw !== "object") return undefined;
  const histogram = (raw as { biasHistogram?: unknown }).biasHistogram;
  if (!histogram || typeof histogram !== "object") return undefined;
  return histogram as Record<string, BiasBucket>;
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

function renderRegimeDistribution(dist?: { total?: number; TREND?: { count: number; pct: number }; RANGE?: { count: number; pct: number }; MISSING?: { count: number; pct: number } } | null): string {
  if (!dist || typeof dist.total !== "number" || dist.total === 0) return "";
  return [
    "### BTC Regime Distribution",
    `- TREND: ${dist.TREND?.count ?? 0} (${dist.TREND?.pct ?? 0}%)`,
    `- RANGE: ${dist.RANGE?.count ?? 0} (${dist.RANGE?.pct ?? 0}%)`,
    `- MISSING: ${dist.MISSING?.count ?? 0} (${dist.MISSING?.pct ?? 0}%)`,
    "",
  ].join("\n");
}

function renderBtcWatchSegments(segments?: Record<string, BtcWatchSegment> | null): string {
  if (!segments) return "";
  const lines: string[] = ["### BTC WATCH Segments"];
  for (const [key, seg] of Object.entries(segments)) {
    lines.push(
      `- ${key}: ${seg.count} (${seg.pct}%) | avg bias ${seg.avgBias ?? "n/a"} | trend ${seg.avgTrend ?? "n/a"} | orderflow ${seg.avgOrderflow ?? "n/a"} | conf ${seg.avgConfidence ?? "n/a"}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderAssetSection(label: string, data: Phase0PayloadData): string {
  const meta = data.meta ?? {};
  const cohort = data.debugMeta?.cohortTimeRange;
  const alerts = buildAlerts(data);
  const isGold = (meta.assetId ?? "").toLowerCase() === "gold";
  const upgrade = isGold ? data.debugMeta?.watchUpgradeCandidates : null;
  const isBtc = (meta.assetId ?? "").toLowerCase() === "btc";
  const outcomesByDecision = getOutcomesByDecision(data);
  const watchSegments = getWatchSegments(data);
  const btcWatchSegments = getBtcWatchSegments(data);
  const biasHistogram = getBiasHistogram(data);
  const outcomesByWatchSegment = getOutcomesByWatchSegment(data);
  const btcAlignment = data.debugMeta?.btcAlignmentBreakdown;
  const btcAlignmentCounters = data.debugMeta?.btcAlignmentCounters as
    | { alignmentResolvedCount?: number; alignmentDerivedCount?: number; alignmentStillMissingCount?: number; total?: number }
    | undefined;
  const btcLevels = data.debugMeta?.btcLevelPlausibility;
  const btcRrr = data.outcomesByBtcTradeRrrBucket;
  const btcDir = data.outcomesByBtcTradeDirection;
  const btcTrend = data.outcomesByBtcTradeTrendBucket;
  const btcVol = data.outcomesByBtcTradeVolBucket;
  const btcRegime = data.debugMeta?.btcRegimeDistribution;
  const btcRegimeOutcomes = data.outcomesByBtcRegime;
  const watchUpgradeOutcomesRaw = (data as { outcomesByWatchUpgradeCandidate?: unknown }).outcomesByWatchUpgradeCandidate;
  const watchUpgradeOutcomes =
    watchUpgradeOutcomesRaw && typeof watchUpgradeOutcomesRaw === "object"
      ? (watchUpgradeOutcomesRaw as OutcomeBucket)
      : null;

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
    renderOutcomes("Outcomes TRADE", outcomesByDecision?.TRADE),
    renderOutcomes("Outcomes WATCH", outcomesByDecision?.WATCH),
    renderOutcomes("Outcomes BLOCKED", outcomesByDecision?.BLOCKED),
    renderWatchProxy(data.watchToTradeProxy ?? null),
    isGold ? renderWatchSegments(watchSegments, outcomesByWatchSegment) : "",
    isBtc ? renderBtcWatchSegments(btcWatchSegments) : "",
    isGold && upgrade
      ? [
          "### Upgrade Candidate (WATCH_FAILS_TREND filtered)",
          `- total WATCH_FAILS_TREND: ${upgrade.totalWatchFailsTrend}`,
          `- candidates: ${upgrade.candidatesCount} (${upgrade.candidatesPctOfWatchFailsTrend}%)`,
          `- avg bias ${upgrade.avgBias ?? "n/a"} | trend ${upgrade.avgTrend ?? "n/a"} | SQ ${upgrade.avgSignalQuality ?? "n/a"} | conf ${upgrade.avgConfidence ?? "n/a"}`,
          watchUpgradeOutcomes
            ? `- outcomes: eval=${watchUpgradeOutcomes.evaluatedCount ?? 0} winRate=${formatPct(
                watchUpgradeOutcomes.winRateTpVsSl ?? 0,
              )}`
            : "- outcomes: n/a",
          "",
        ].join("\n")
      : "",
    isBtc && btcAlignment
      ? [
          "### Alignment / NO_TRADE reasons (BTC)",
          btcAlignmentCounters
            ? `- alignment resolved=${btcAlignmentCounters.alignmentResolvedCount ?? 0} | derived=${btcAlignmentCounters.alignmentDerivedCount ?? 0} | missing=${btcAlignmentCounters.alignmentStillMissingCount ?? 0} | total=${btcAlignmentCounters.total ?? 0}`
            : "",
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
    isBtc && btcDir
      ? [
          "### BTC TRADE by Direction",
          ...Object.entries(btcDir).map(
            ([dir, v]) =>
              `- ${dir}: hit_tp=${v.hit_tp ?? 0} hit_sl=${v.hit_sl ?? 0} open=${v.open ?? 0} eval=${v.evaluatedCount ?? 0} winRate=${formatPct(
                v.winRateTpVsSl ?? 0,
              )}`,
          ),
          "",
        ].join("\n")
      : "",
    isBtc && btcRegime
      ? [
          "### BTC TREND-only Gate",
          `- Regime TREND: ${btcRegime.TREND?.count ?? 0} (${btcRegime.TREND?.pct ?? 0}%)`,
          `- Regime RANGE: ${btcRegime.RANGE?.count ?? 0} (${btcRegime.RANGE?.pct ?? 0}%)`,
          `- Regime MISSING: ${btcRegime.MISSING?.count ?? 0} (${btcRegime.MISSING?.pct ?? 0}%)`,
          data.debugMeta?.btcTrendOnlyGate
            ? `- Trades allowed (TREND): ${data.debugMeta.btcTrendOnlyGate.tradesAllowed ?? 0} | blocked by regime: ${data.debugMeta.btcTrendOnlyGate.tradesBlockedByRegime ?? 0}`
            : "- Trades allowed (TREND): n/a",
          "",
        ].join("\n")
      : "",
    isBtc && btcRegimeOutcomes
      ? [
          "### BTC Outcomes by Regime (TRADE only)",
          ...Object.entries(btcRegimeOutcomes).map(([bucket, v]) => {
            const evaluated = v.evaluatedCount ?? ((v.hit_tp ?? 0) + (v.hit_sl ?? 0));
            const winRate = evaluated > 0 ? (v.hit_tp ?? 0) / evaluated : 0;
            return `- ${bucket}: eval=${evaluated} winRate=${formatPct(winRate)}`;
          }),
          "",
        ].join("\n")
      : "",
    isBtc ? renderRegimeDistribution(btcRegime ?? null) : "",
    isBtc && btcTrend
      ? [
          "### BTC TRADE by Trend Bucket",
          ...Object.entries(btcTrend).map(
            ([bucket, v]) =>
              `- ${bucket}: hit_tp=${v.hit_tp ?? 0} hit_sl=${v.hit_sl ?? 0} open=${v.open ?? 0} eval=${v.evaluatedCount ?? 0} winRate=${formatPct(
                v.winRateTpVsSl ?? 0,
              )}`,
          ),
          "",
        ].join("\n")
      : "",
    isBtc && btcVol
      ? [
          "### BTC TRADE by Volatility Bucket",
          ...Object.entries(btcVol).map(
            ([bucket, v]) =>
              `- ${bucket}: hit_tp=${v.hit_tp ?? 0} hit_sl=${v.hit_sl ?? 0} open=${v.open ?? 0} eval=${v.evaluatedCount ?? 0} winRate=${formatPct(
                v.winRateTpVsSl ?? 0,
              )}`,
          ),
          "",
        ].join("\n")
      : "",
    renderBiasHistogram(biasHistogram),
  ];
  return lines.join("\n");
}

export function renderAssetSummarySection(summary: AssetPhase0Summary, label?: string): string {
  const name = label ?? `${summary.meta.assetId.toUpperCase()} Swing`;
  const lines: string[] = [];
  lines.push(`## ${name} (${summary.meta.timeframe ?? "n/a"})`);
  lines.push(`- Meta: asset=${summary.meta.assetId} tf=${summary.meta.timeframe} days=${summary.meta.sampleWindowDays}`);
  lines.push("");
  if (summary.meta.labelsUsedCounts && Object.keys(summary.meta.labelsUsedCounts).length > 0) {
    const labels = summary.meta.labelsUsedCounts as Record<string, number>;
    const sortedLabels = Object.entries(labels).sort((a, b) => b[1] - a[1]);
    const labelTable = ["| Label | Count |", "| --- | ---: |", ...sortedLabels.map(([k, v]) => `| ${k} | ${v} |`), ""];
    lines.push("### Labels Used");
    lines.push(labelTable.join("\n"));
  }
  lines.push(renderCountTable("Decision Distribution", summary.decisionDistribution as Record<string, number>));
  if (summary.gradeDistribution) lines.push(renderCountTable("Grade Distribution", summary.gradeDistribution as Record<string, number>));
  if (summary.watchSegmentsDistribution) lines.push(renderCountTable("WATCH Segments", summary.watchSegmentsDistribution as Record<string, number>));
  if (summary.alignmentDistribution) lines.push(renderCountTable("FX Alignment Distribution", summary.alignmentDistribution as Record<string, number>));
  if (summary.upgradeCandidates) {
    lines.push("### WATCH+ / Upgrade Candidates");
    lines.push(`- total: ${summary.upgradeCandidates.total}`);
    if (summary.upgradeCandidates.byReason) {
      const byReason = summary.upgradeCandidates.byReason as Record<string, number>;
      Object.entries(byReason)
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
    }
    lines.push("");
  }
  if (summary.regimeDistribution)
    lines.push(renderCountTable("Regime Distribution", summary.regimeDistribution as Record<string, number>));
  if (summary.diagnostics) {
    lines.push("### Diagnostics");
    if (summary.diagnostics.regimeDistribution) {
      lines.push(renderCountTable("Regime Distribution", summary.diagnostics.regimeDistribution as Record<string, number>));
    }
    if (summary.diagnostics.volatilityBuckets && summary.diagnostics.volatilityBuckets.length > 0) {
      const volTable = ["| Bucket | Count |", "| --- | ---: |", ...summary.diagnostics.volatilityBuckets.map((b) => `| ${b.bucket} | ${b.count} |`), ""];
      lines.push("#### Volatility Buckets");
      lines.push(volTable.join("\n"));
    }
    if (
      !summary.diagnostics.regimeDistribution &&
      !(summary.diagnostics.volatilityBuckets && summary.diagnostics.volatilityBuckets.length > 0)
    ) {
      lines.push("- No diagnostics data");
    }
    if (summary.diagnostics.notes && summary.diagnostics.notes.length > 0) {
      summary.diagnostics.notes.forEach((n) => lines.push(`- ${n}`));
    }
    lines.push("");
  }
  if (summary.blockedReasonsDistribution && Object.keys(summary.blockedReasonsDistribution).length) {
    lines.push(renderCountTable("Blocked Reasons", summary.blockedReasonsDistribution));
  }
  if (summary.noTradeReasonsDistribution && Object.keys(summary.noTradeReasonsDistribution).length) {
    lines.push(renderCountTable("NO_TRADE Reasons", summary.noTradeReasonsDistribution));
  }
  if (summary.watchReasonsDistribution && Object.keys(summary.watchReasonsDistribution).length) {
    lines.push(renderCountTable("WATCH Reasons", summary.watchReasonsDistribution));
  }
  return lines.join("\n");
}

async function main() {
  const gold = await loadJson("phase0_gold.json");
  const btc = await loadJson("phase0_btc.json");

const summariesFromPayload = gold.summaries ?? btc.summaries ?? undefined;

  const sampleWindowDays =
    gold.meta?.daysBack ?? btc.meta?.daysBack ?? gold.meta?.daysBack ?? 30;

  const fallbackSummaryFromPayload = (data: Phase0PayloadData, assetId: string): AssetPhase0Summary => {
    const dist = data.decisionDistribution;
    const grade = data.gradeDistribution;
    const watchSegments = data.debugMeta?.watchSegments
      ? Object.fromEntries(Object.entries(data.debugMeta.watchSegments).map(([k, v]) => [k, v.count]))
      : undefined;
    const defaultDecision = { TRADE: 0, WATCH: 0, BLOCKED: 0 };
    return {
      meta: { assetId, timeframe: (data.meta?.timeframe ?? "1D").toString(), sampleWindowDays, labelsUsedCounts: undefined },
      decisionDistribution: dist
        ? Object.fromEntries(
            Object.entries(dist)
              .filter(([k]) => k !== "total")
              .map(([k, v]) => [k, typeof v === "number" ? v : (v as { count?: number }).count ?? 0]),
          )
        : defaultDecision,
      gradeDistribution: grade
        ? Object.fromEntries(
            Object.entries(grade)
              .filter(([k]) => k !== "total")
              .map(([k, v]) => [k, typeof v === "number" ? v : (v as { count?: number }).count ?? 0]),
          )
        : undefined,
      watchSegmentsDistribution: watchSegments,
      upgradeCandidates: data.debugMeta?.watchUpgradeCandidates
        ? { total: data.debugMeta.watchUpgradeCandidates.candidatesCount ?? 0 }
        : undefined,
      regimeDistribution: undefined,
    };
  };

  const summaries: Record<string, AssetPhase0Summary> = { ...(summariesFromPayload ?? {}) };
  const ensure = (assetId: string, data: Phase0PayloadData) => {
    if (!summaries[assetId]) {
      summaries[assetId] = fallbackSummaryFromPayload(data, assetId);
    }
  };
  ensure("gold", gold);
  ensure("btc", btc);
  ensure("eurusd", {} as Phase0PayloadData);
  ensure("spx", {} as Phase0PayloadData);
  ensure("dax", {} as Phase0PayloadData);
  ensure("ndx", {} as Phase0PayloadData);
  ensure("dow", {} as Phase0PayloadData);
  ensure("gbpusd", {} as Phase0PayloadData);
  ensure("usdjpy", {} as Phase0PayloadData);
  ensure("eurjpy", {} as Phase0PayloadData);

  if (process.env.NODE_ENV !== "production") {
    const keys = Object.keys(summariesFromPayload ?? {});
    // eslint-disable-next-line no-console
    console.log(`Phase0 summaries received: ${keys.join(",")}`);
  }

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

  const assetOrder = ["gold", "btc", "eurusd", "gbpusd", "usdjpy", "eurjpy", "spx", "dax", "ndx", "dow"];
  assetOrder
    .filter((a) => summaries[a])
    .forEach((assetId) => {
      reportLines.push(renderAssetSummarySection(summaries[assetId], `${assetId.toUpperCase()} Swing`));
    });

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

if (process.env.VITEST !== "true" && !process.env.VITEST_WORKER_ID) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
