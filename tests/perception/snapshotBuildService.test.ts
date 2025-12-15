import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  requestSnapshotBuild,
  __dangerouslyResetSnapshotBuildStateForTests,
} from "@/src/server/perception/snapshotBuildService";

const buildSetupsMock = vi.hoisted(() => ({
  buildAndStorePerceptionSnapshot: vi.fn(async () => createSnapshot("built-snapshot", "2099-01-02T07:30:00Z")),
}));

const snapshotStoreMock = vi.hoisted(() => ({
  loadLatestSnapshotFromStore: vi.fn(async () => null as PerceptionSnapshotWithItems | null),
}));

const dbExecuteQueue = vi.hoisted(() => [] as Array<Array<Record<string, unknown>>>);
const dbExecuteMock = vi.hoisted(() => vi.fn(async () => dbExecuteQueue.shift() ?? []));

vi.mock("@/src/features/perception/build/buildSetups", () => buildSetupsMock);
vi.mock("@/src/features/perception/cache/snapshotStore", () => snapshotStoreMock);
vi.mock("@/src/server/db/db", () => ({
  db: {
    execute: dbExecuteMock,
  },
}));

describe("snapshotBuildService", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-02T09:00:00Z"));
    snapshotStoreMock.loadLatestSnapshotFromStore.mockReset();
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValue(null);
    buildSetupsMock.buildAndStorePerceptionSnapshot.mockReset();
    buildSetupsMock.buildAndStorePerceptionSnapshot.mockResolvedValue(
      createSnapshot("built-snapshot", "2099-01-02T07:30:00Z"),
    );
    dbExecuteQueue.length = 0;
    dbExecuteMock.mockClear();
    await __dangerouslyResetSnapshotBuildStateForTests();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await __dangerouslyResetSnapshotBuildStateForTests();
  });

  it("returns cached snapshot when latest entry is from today", async () => {
    const cachedSnapshot = createSnapshot("cached-snapshot", "2099-01-02T06:00:00Z");
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValueOnce(cachedSnapshot);

    const result = await requestSnapshotBuild({ source: "ui" });

    expect(result.snapshot).toBe(cachedSnapshot);
    expect(result.reused).toBe(true);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).not.toHaveBeenCalled();
    expect(dbExecuteMock).not.toHaveBeenCalled();
  });

  it("builds a snapshot when the cache is empty", async () => {
    mockSuccessfulLockCycle();
    const builtSnapshot = createSnapshot("fresh-build", "2099-01-02T07:45:00Z");
    buildSetupsMock.buildAndStorePerceptionSnapshot.mockResolvedValueOnce(builtSnapshot);

    const result = await requestSnapshotBuild({ source: "cron" });

    expect(result.snapshot).toBe(builtSnapshot);
    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledWith({ source: "cron" });
    expect(dbExecuteMock).toHaveBeenCalledTimes(2);
  });

  it("forces a rebuild even if a cached snapshot exists", async () => {
    const cachedSnapshot = createSnapshot("cached-snapshot", "2099-01-02T06:00:00Z");
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValueOnce(cachedSnapshot);
    mockSuccessfulLockCycle();

    const result = await requestSnapshotBuild({ source: "admin", force: true });

    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledTimes(1);
    expect(dbExecuteMock).toHaveBeenCalledTimes(2);
  });

  it("rebuilds when cached snapshot is stale", async () => {
    const staleSnapshot = createSnapshot("stale-snapshot", "2099-01-01T05:00:00Z");
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValueOnce(staleSnapshot);
    mockSuccessfulLockCycle();

    const result = await requestSnapshotBuild({ source: "ui" });

    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledTimes(1);
    expect(dbExecuteMock).toHaveBeenCalledTimes(2);
    expect(result.snapshot.snapshot.id).toBe("built-snapshot");
  });
});

function mockSuccessfulLockCycle() {
  dbExecuteQueue.push([{ locked: true }]);
  dbExecuteQueue.push([{ released: true }]);
}

function createSnapshot(id: string, isoTime: string): PerceptionSnapshotWithItems {
  const timestamp = new Date(isoTime);
  return {
    snapshot: {
      id,
      snapshotTime: timestamp,
      label: "vitest",
      version: "test",
      dataMode: "mock",
      generatedMs: 10,
      notes: JSON.stringify({ source: id }),
      setups: [],
      createdAt: timestamp,
    },
    items: [],
    setups: [],
  };
}
