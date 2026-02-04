import { describe, expect, it, vi, beforeEach } from "vitest";
import * as fsPromises from "node:fs/promises";

vi.mock("node:fs/promises", () => ({ mkdir: vi.fn(async () => {}), writeFile: vi.fn(async () => {}) }));
vi.mock("@/src/server/repositories/backtestRunRepository", () => ({ upsertBacktestRun: vi.fn(async () => {}) }));

let runBacktest: typeof import("@/src/server/backtest/runBacktest").runBacktest;

const createDataSource = vi.fn();
const writeReport = vi.fn();
const loadPlaybackSetups = vi.fn();
const getCandleOpenPrice = vi.fn();

describe("runBacktest playback mode", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("@/src/server/backtest/runBacktest");
    runBacktest = mod.runBacktest;
    createDataSource.mockReturnValue({});
    writeReport.mockResolvedValue(undefined);
    loadPlaybackSetups.mockResolvedValue([
      { id: "s-play", direction: "long", scoreTotal: 70 },
    ]);
    getCandleOpenPrice.mockImplementation((assetId: string, _tf: string, timestamp: Date) => {
      const iso = timestamp.toISOString();
      if (iso.includes("T04:00:00.000Z")) return 110;
      if (iso.includes("T08:00:00.000Z")) return 120;
      return 100;
    });
  });

  it("creates trades using playback snapshots and next-step open fills", async () => {
    const result = await runBacktest({
      assetId: "btc",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T08:00:00.000Z",
      stepHours: 4,
      snapshotMode: "playback",
      deps: { createDataSource, loadPlaybackSetups, getCandleOpenPrice, writeReport },
    });

    expect(result.ok).toBe(true);
    const writtenReport = (writeReport as unknown as vi.Mock).mock.calls[0][0] as {
      trades?: Array<{ entry: { price: number }; exit: { price: number }; side: string }>;
      steps: Array<{ topSetup?: { decision?: string | null } }>;
    };
    expect(writtenReport.trades?.length).toBe(1);
    expect(writtenReport.trades?.[0]?.entry.price).toBe(110);
    expect(writtenReport.trades?.[0]?.exit.price).toBe(120);
    expect(writtenReport.steps[0].topSetup?.decision).toBe("buy");
  });
});
