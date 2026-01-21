#!/usr/bin/env ts-node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type InputReport = {
  byKey: Array<{
    key: {
      assetId: string;
      playbookId: string;
      decision: string;
      grade: string;
      label: string;
      timeframe: string;
    };
    outcomesTotal: number;
  }>;
};

type Summary = {
  assetId: string;
  playbookCounts: Record<string, number>;
  decisions: Record<string, number>;
  grades: Record<string, number>;
};

function parseArgs() {
  const args = process.argv.slice(2);
  let input =
    path.join(process.cwd(), "artifacts", "phase1", "swing-outcome-analysis-latest-v1.json");
  const assets: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      input = arg.replace("--input=", "");
    } else if (arg.startsWith("--assets=")) {
      assets.push(
        ...arg
          .replace("--assets=", "")
          .split(",")
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean),
      );
    }
  }
  return { input, assets: assets.length ? assets : ["wti", "silver"] };
}

function summarize(report: InputReport, assets: string[]): Summary[] {
  const summaries: Summary[] = [];
  for (const assetId of assets) {
    const rows = report.byKey.filter((r) => r.key.assetId === assetId);
    const playbookCounts: Record<string, number> = {};
    const decisions: Record<string, number> = {};
    const grades: Record<string, number> = {};
    for (const row of rows) {
      playbookCounts[row.key.playbookId] = (playbookCounts[row.key.playbookId] ?? 0) + row.outcomesTotal;
      decisions[row.key.decision] = (decisions[row.key.decision] ?? 0) + row.outcomesTotal;
      grades[row.key.grade] = (grades[row.key.grade] ?? 0) + row.outcomesTotal;
    }
    summaries.push({ assetId, playbookCounts, decisions, grades });
  }
  return summaries;
}

function renderMd(summaries: Summary[], input: string): string {
  const lines: string[] = [];
  lines.push("# Phase-1.1 Debug: Playbook Dimensions (v1)");
  lines.push(`Input: ${input}`);
  lines.push("");
  for (const s of summaries) {
    lines.push(`## ${s.assetId}`);
    lines.push("| Playbook | Outcomes |");
    lines.push("| --- | ---: |");
    for (const [pb, count] of Object.entries(s.playbookCounts)) {
      lines.push(`| ${pb} | ${count} |`);
    }
    lines.push("");
    lines.push("| Decision | Outcomes |");
    lines.push("| --- | ---: |");
    for (const [d, count] of Object.entries(s.decisions)) {
      lines.push(`| ${d} | ${count} |`);
    }
    lines.push("");
    lines.push("| Grade | Outcomes |");
    lines.push("| --- | ---: |");
    for (const [g, count] of Object.entries(s.grades)) {
      lines.push(`| ${g} | ${count} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const params = parseArgs();
  const raw = readFileSync(params.input, "utf8");
  const report = JSON.parse(raw) as InputReport;
  const summaries = summarize(report, params.assets);
  const outDir = path.join(process.cwd(), "artifacts", "phase1");
  mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:]/g, "-");
  const jsonPath = path.join(outDir, `phase1-1-debug-playbook-dimensions-v1.json`);
  const mdPath = path.join(outDir, `phase1-1-debug-playbook-dimensions-v1.md`);
  const payload = { generatedAt: ts, input: params.input, assets: params.assets, summaries };
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  writeFileSync(mdPath, renderMd(summaries, params.input));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${jsonPath}`);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${mdPath}`);
}

main();
