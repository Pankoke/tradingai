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

type ReservedMock = ((...args: unknown[]) => Promise<Array<Record<string, unknown>>>) & {
  unsafe: (...args: unknown[]) => Promise<Array<Record<string, unknown>>>;
  release: () => void;
};

const lockQueryQueue = vi.hoisted(() => [] as Array<Array<Record<string, unknown>>>);

const createReservedMock = (): ReservedMock => {
  const queryFn = vi.fn(async () => lockQueryQueue.shift() ?? []);
  const unsafeFn = vi.fn(async () => lockQueryQueue.shift() ?? []);
  const reserved = queryFn as ReservedMock;
  reserved.unsafe = unsafeFn;
  reserved.release = vi.fn(() => undefined);
  return reserved;
};

const lockReserveMock = vi.hoisted(() => vi.fn(async () => createReservedMock()));

vi.mock("@/src/features/perception/build/buildSetups", () => buildSetupsMock);
vi.mock("@/src/features/perception/cache/snapshotStore", () => snapshotStoreMock);
vi.mock("@/src/server/db/db", () => ({
  db: {
    execute: vi.fn(),
  },
  lockClient: {
    reserve: lockReserveMock,
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
    lockQueryQueue.length = 0;
    lockReserveMock.mockClear();
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
    expect(lockReserveMock).not.toHaveBeenCalled();
  });

  it("builds a snapshot when the cache is empty", async () => {
    mockSuccessfulLockCycle();
    const builtSnapshot = createSnapshot("fresh-build", "2099-01-02T07:45:00Z");
    buildSetupsMock.buildAndStorePerceptionSnapshot.mockResolvedValueOnce(builtSnapshot);

    const result = await requestSnapshotBuild({ source: "cron" });

    expect(result.snapshot).toBe(builtSnapshot);
    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledWith({ source: "cron" });
    expect(lockReserveMock).toHaveBeenCalledTimes(1);
  });

  it("forces a rebuild even if a cached snapshot exists", async () => {
    const cachedSnapshot = createSnapshot("cached-snapshot", "2099-01-02T06:00:00Z");
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValueOnce(cachedSnapshot);
    mockSuccessfulLockCycle();

    const result = await requestSnapshotBuild({ source: "admin", force: true });

    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledTimes(1);
    expect(lockReserveMock).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when cached snapshot is stale", async () => {
    const staleSnapshot = createSnapshot("stale-snapshot", "2099-01-01T05:00:00Z");
    snapshotStoreMock.loadLatestSnapshotFromStore.mockResolvedValueOnce(staleSnapshot);
    mockSuccessfulLockCycle();

    const result = await requestSnapshotBuild({ source: "ui" });

    expect(result.reused).toBe(false);
    expect(buildSetupsMock.buildAndStorePerceptionSnapshot).toHaveBeenCalledTimes(1);
    expect(lockReserveMock).toHaveBeenCalledTimes(1);
    expect(result.snapshot.snapshot.id).toBe("built-snapshot");
  });
});

function mockSuccessfulLockCycle() {
  lockQueryQueue.push([{ locked: true }]);
  lockQueryQueue.push([{ released: true }]);
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
