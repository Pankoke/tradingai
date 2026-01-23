import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { ReportSchema } from "@/src/app/[locale]/admin/playbooks/schema";
import { aggregatePlaybooks } from "@/src/app/[locale]/admin/playbooks/page";

const sample: z.infer<typeof ReportSchema> = {
  version: "v1",
  generatedAt: "2026-01-01T00:00:00Z",
  params: { days: 30, timeframes: ["1d"], labels: ["eod"] },
  overall: {
    outcomesTotal: 3,
    closedCount: 3,
    openCount: 0,
    tpCount: 2,
    slCount: 1,
    expiredCount: 0,
    ambiguousCount: 0,
    invalidCount: 0,
    unknownCount: 0,
    winrateDefinition: "tp/(tp+sl)",
    closeRate: 1,
  },
  byKey: [
    {
      key: { assetId: "gold", timeframe: "1d", label: "eod", playbookId: "gold-swing-v0.2", decision: "TRADE", grade: "A" },
      outcomesTotal: 1,
      closedCount: 1,
      openCount: 0,
      tpCount: 1,
      slCount: 0,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
    {
      key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "energy-swing-v0.1", decision: "TRADE", grade: "B" },
      outcomesTotal: 1,
      closedCount: 1,
      openCount: 0,
      tpCount: 0,
      slCount: 1,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
    {
      key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "energy-swing-v0.1", decision: "TRADE", grade: "B" },
      outcomesTotal: 1,
      closedCount: 1,
      openCount: 0,
      tpCount: 1,
      slCount: 0,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
  ],
};

describe("Playbook aggregation", () => {
  it("aggregates winrate and flags", () => {
    const rows = aggregatePlaybooks(sample, {
      timeframe: "all",
      label: "all",
      minClosed: 1,
      includeOpenOnly: false,
    });
    const energy = rows.find((r) => r.playbookId === "energy-swing-v0.1");
    const gold = rows.find((r) => r.playbookId === "gold-swing-v0.2");
    expect(energy?.outcomesTotal).toBe(2);
    expect(energy?.tpCount).toBe(1);
    expect(energy?.slCount).toBe(1);
    expect(energy?.winrate).toBe(0.5);
    expect(gold?.winrate).toBe(1);
    expect(rows[0].playbookId).toBe("energy-swing-v0.1"); // closed desc
  });
});
