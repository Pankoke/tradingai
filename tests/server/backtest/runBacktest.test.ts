import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import type { PerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import * as fsPromises from "node:fs/promises";

vi.mock("node:fs/promises", () => {
  return {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
  };
});

let runBacktest: typeof import("@/src/server/backtest/runBacktest").runBacktest;

const sentimentA: SentimentSnapshotV2 = {
  assetId: "A",
  asOfIso: "2025-01-01T00:00:00.000Z",
  window: { fromIso: "2024-12-31T00:00:00.000Z", toIso: "2025-01-01T00:00:00.000Z" },
  sources: [{ sourceId: "primary", weight: 1 }],
  components: { polarityScore: 0.1, confidence: 0.5 },
};

describe("runBacktest", () => {
  const buildSnapshot = vi.fn();
  const writeReport = vi.fn();
  const loadSentimentSnapshot = vi.fn();
  const createDataSource = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("@/src/server/backtest/runBacktest");
    runBacktest = mod.runBacktest;
    createDataSource.mockReturnValue({
      assets: { getActiveAssets: async () => [{ id: "A", symbol: "A" }] },
      events: {} as PerceptionDataSource["getEventsForWindow"],
      candles: {} as never,
      sentiment: { fetchSentiment: vi.fn() },
      biasProvider: { getBiasSnapshot: vi.fn() },
      timeframeConfig: { getProfileTimeframes: vi.fn(), getTimeframesForAsset: vi.fn(), TIMEFRAME_SYNC_WINDOWS: {} },
      resolveProviderSymbol: vi.fn(),
    });
    buildSnapshot.mockImplementation(async ({ asOf }) => ({
      asOf,
      setups: [],
      label: "ok",
      score: 42,
    } as unknown as PerceptionSnapshot));
    loadSentimentSnapshot.mockResolvedValue(sentimentA);
    writeReport.mockResolvedValue(undefined);
  });

  it("iterates steps deterministically and writes report", async () => {
    const result = await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T04:00:00.000Z",
      stepHours: 2,
      deps: {
        createDataSource,
        buildSnapshot,
        loadSentimentSnapshot,
        writeReport,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toBe(3);
    expect(buildSnapshot).toHaveBeenCalledTimes(3);
    expect(writeReport).toHaveBeenCalledTimes(1);
  });

  it("returns error on invalid range", async () => {
    const result = await runBacktest({
      assetId: "A",
      fromIso: "bad",
      toIso: "2025-01-01T00:00:00.000Z",
      stepHours: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("creates directories before writing report", async () => {
    const callOrder: string[] = [];
    (fsPromises.mkdir as unknown as vi.Mock).mockImplementation(async () => {
      callOrder.push("mkdir");
    });
    (fsPromises.writeFile as unknown as vi.Mock).mockImplementation(async () => {
      callOrder.push("writeFile");
    });

    await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T02:00:00.000Z",
      stepHours: 2,
      deps: {
        createDataSource,
        buildSnapshot,
        loadSentimentSnapshot,
      },
    });

    expect(callOrder[0]).toBe("mkdir");
    expect(callOrder[1]).toBe("writeFile");
  });

  it("populates topSetup and setupsSummary with scores", async () => {
    buildSnapshot.mockImplementation(async ({ asOf }) => ({
      asOf,
      setups: [
        { id: "s1", setupGrade: "A", direction: "Long", balanceScore: 70, confidence: 80 },
        { id: "s2", setupGrade: "B", direction: "Short", balanceScore: 40 },
        { id: "s3", setupGrade: "A", direction: "Long", balanceScore: 65 },
      ],
      label: "snapshot-label",
    }));

    const result = await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T02:00:00.000Z",
      stepHours: 1,
      deps: { createDataSource, buildSnapshot, loadSentimentSnapshot, writeReport },
    });

    expect(result.ok).toBe(true);
    const callArgs = (writeReport as vi.Mock).mock.calls[0] as [unknown, string];
    const writtenReport = callArgs[0] as {
      steps: Array<{
        topSetup?: { scoreTotal?: number | null; gradeSource?: string | null; decisionSource?: string | null };
        setupsSummary?: Array<{ gradeSource?: string | null; decisionSource?: string | null }>;
        score?: number | null;
        label?: string | null;
        sentimentSnapshotFound?: boolean;
      }>;
      summary: { avgScoreTotal?: number | null };
    };
    const step = writtenReport.steps[0];
    expect(step.topSetup?.scoreTotal).toBe(70);
    expect(step.topSetup?.grade).toBe("A");
    expect(step.topSetup?.decision).toBe("buy");
    expect(step.topSetup?.gradeSource).toBe("engine");
    expect(step.topSetup?.decisionSource).toBe("direction");
    expect(step.score).toBe(70);
    expect(step.setupsSummary?.length).toBe(3);
    expect(step.label).toBe("buy"); // from top setup decision
    expect(step.sentimentSnapshotFound).toBe(false);
    expect(writtenReport.summary?.avgScoreTotal).toBeGreaterThan(0);
  });

  it("derives grade from score when missing", async () => {
    buildSnapshot.mockImplementation(async ({ asOf }) => ({
      asOf,
      setups: [{ id: "s1", direction: "Long", balanceScore: 82 }],
    }));

    const result = await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T02:00:00.000Z",
      stepHours: 1,
      deps: { createDataSource, buildSnapshot, loadSentimentSnapshot, writeReport },
    });

    expect(result.ok).toBe(true);
    const writtenReport = (writeReport as vi.Mock).mock.calls[0][0] as {
      steps: Array<{
        topSetup?: { grade?: string | null; gradeSource?: string | null };
        setupsSummary?: Array<{ grade?: string | null; gradeSource?: string | null }>;
      }>;
      summary: { gradeCounts: Record<string, number> };
    };
    const step = writtenReport.steps[0];
    expect(step.topSetup?.grade).toBe("B");
    expect(step.topSetup?.gradeSource).toBe("derived");
    expect(step.setupsSummary?.[0]?.grade).toBe("B");
    expect(step.setupsSummary?.[0]?.gradeSource).toBe("derived");
    expect(writtenReport.summary.gradeCounts.B).toBeGreaterThan(0);
  });

  it("counts decisions and grades from setupGrade/direction fallbacks", async () => {
    buildSnapshot.mockImplementation(async ({ asOf }) => ({
      asOf,
      setups: [
        { id: "s1", setupGrade: "A", direction: "Long", balanceScore: 70 },
        { id: "s2", setupGrade: "NO_TRADE", direction: "Long", balanceScore: 10 },
      ],
      label: "snapshot-label",
    }));

    const result = await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T02:00:00.000Z",
      stepHours: 2,
      deps: { createDataSource, buildSnapshot, loadSentimentSnapshot, writeReport },
    });

    expect(result.ok).toBe(true);
    const writtenReport = (writeReport as vi.Mock).mock.calls[0][0] as {
      summary: { decisionCounts: Record<string, number>; gradeCounts: Record<string, number> };
      steps: Array<{ topSetup?: { decision?: string | null; grade?: string | null; decisionSource?: string | null } }>;
    };
    expect(writtenReport.steps[0].topSetup?.decision).toBe("buy");
    expect(writtenReport.steps[0].topSetup?.grade).toBe("A");
    expect(writtenReport.summary.decisionCounts.buy).toBeGreaterThan(0);
    expect(writtenReport.summary.gradeCounts.A).toBeGreaterThan(0);
  });

  it("applies decision fallback policy deterministically", async () => {
    let call = 0;
    buildSnapshot.mockImplementation(async ({ asOf }) => {
      const datasets = [
        [{ id: "s1", decision: "NO_TRADE", direction: "Long", balanceScore: 10 }],
        [{ id: "s2", direction: "Short", balanceScore: 20 }],
        [{ id: "s3", balanceScore: 30 }],
      ];
      const setups = datasets[call] ?? datasets[datasets.length - 1];
      call += 1;
      return { asOf, setups };
    });

    const result = await runBacktest({
      assetId: "A",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T02:00:00.000Z",
      stepHours: 1,
      deps: { createDataSource, buildSnapshot, loadSentimentSnapshot, writeReport },
    });

    expect(result.ok).toBe(true);
    const report = (writeReport as vi.Mock).mock.calls[0][0] as {
      steps: Array<{ topSetup?: { decision?: string | null } }>;
      summary: { decisionCounts: Record<string, number> };
    };
    expect(report.steps[0].topSetup?.decision).toBe("no-trade");
    expect(report.steps[0].topSetup?.decisionSource).toBe("engine");
    expect(report.steps[1].topSetup?.decision).toBe("sell");
    expect(report.steps[2].topSetup?.decision).toBe("unknown");
    expect(report.summary.decisionCounts["no-trade"]).toBe(1);
    expect(report.summary.decisionCounts.sell).toBe(1);
    expect(report.summary.decisionCounts.unknown).toBe(1);
  });

  it("throws on sentiment lookahead in debug mode", async () => {
    loadSentimentSnapshot.mockImplementation(async (_assetId: string, _asOf: Date) => ({
      assetId: "A",
      asOfIso: "2999-01-01T00:00:00.000Z",
      window: { fromIso: "2998-12-31T00:00:00.000Z", toIso: "2999-01-01T00:00:00.000Z" },
      sources: [],
      components: { polarityScore: 0, confidence: 0 },
    }));

    await expect(
      runBacktest({
        assetId: "A",
        fromIso: "2025-01-01T00:00:00.000Z",
        toIso: "2025-01-01T02:00:00.000Z",
        stepHours: 1,
        deps: { createDataSource, buildSnapshot, loadSentimentSnapshot, writeReport },
        debug: true,
      }),
    ).rejects.toThrow(/sentiment snapshot/);
  });
});
