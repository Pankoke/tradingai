import { describe, expect, it, vi } from "vitest";

type Spies = {
  selectChainResult: Array<{ id: string; runKey: string }>;
  limitSpy: ReturnType<typeof vi.fn>;
  orderBySpy: ReturnType<typeof vi.fn>;
  whereSpy: ReturnType<typeof vi.fn>;
  fromSpy: ReturnType<typeof vi.fn>;
  selectSpy: ReturnType<typeof vi.fn>;
  onConflictSpy: ReturnType<typeof vi.fn>;
  valuesSpy: ReturnType<typeof vi.fn>;
  insertSpy: ReturnType<typeof vi.fn>;
};

const spies = vi.hoisted<Spies>(() => {
  const selectChainResult = [{ id: "row1", runKey: "k" }];
  const limitSpy = vi.fn().mockReturnValue(selectChainResult);
  const orderBySpy = vi.fn(() => ({ limit: limitSpy }));
  const whereSpy = vi.fn(() => ({ limit: limitSpy }));
  const fromSpy = vi.fn(() => ({ where: whereSpy, orderBy: orderBySpy }));
  const selectSpy = vi.fn(() => ({ from: fromSpy, orderBy: orderBySpy }));
  const onConflictSpy = vi.fn().mockResolvedValue(undefined);
  const valuesSpy = vi.fn(() => ({ onConflictDoUpdate: onConflictSpy }));
  const insertSpy = vi.fn(() => ({ values: valuesSpy }));
  return { selectChainResult, limitSpy, orderBySpy, whereSpy, fromSpy, selectSpy, onConflictSpy, valuesSpy, insertSpy };
});

vi.mock("@/src/server/db/db", () => ({
  db: {
    insert: spies.insertSpy,
    select: spies.selectSpy,
  },
}));

import { backtestRuns } from "@/src/server/db/schema/backtestRuns";
import {
  getBacktestRunByKey,
  listRecentBacktestRuns,
  listRecentBacktestRunsMeta,
  upsertBacktestRun,
} from "@/src/server/repositories/backtestRunRepository";

const sample = {
  runKey: "rk",
  assetId: "BTC",
  fromIso: "2026-01-01T00:00:00.000Z",
  toIso: "2026-01-02T00:00:00.000Z",
  stepHours: 4,
};

describe("backtestRunRepository", () => {
  it("upserts by runKey", async () => {
    await upsertBacktestRun(sample);
    expect(spies.insertSpy).toHaveBeenCalledTimes(1);
    expect(spies.valuesSpy).toHaveBeenCalledWith(expect.objectContaining(sample));
    expect(spies.onConflictSpy).toHaveBeenCalledWith(expect.objectContaining({ target: backtestRuns.runKey }));
  });

  it("gets by runKey", async () => {
    const row = await getBacktestRunByKey("k");
    expect(spies.selectSpy).toHaveBeenCalled();
    expect(spies.fromSpy).toHaveBeenCalledWith(backtestRuns);
    expect(spies.whereSpy).toHaveBeenCalledWith(expect.anything());
    expect(row).toEqual(spies.selectChainResult[0]);
  });

  it("lists recent", async () => {
    const rows = await listRecentBacktestRuns(5);
    expect(spies.selectSpy).toHaveBeenCalled();
    expect(spies.orderBySpy).toHaveBeenCalled();
    expect(spies.limitSpy).toHaveBeenCalledWith(5);
    expect(rows).toEqual(spies.selectChainResult);
  });

  it("lists recent meta without trades", async () => {
    const rows = await listRecentBacktestRunsMeta(3);
    expect(spies.selectSpy).toHaveBeenCalled();
    expect(spies.limitSpy).toHaveBeenCalledWith(3);
    expect(rows[0]).not.toHaveProperty("trades");
  });
});
