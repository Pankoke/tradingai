import { sql } from "drizzle-orm";
import { buildAndStorePerceptionSnapshot, type SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";
import { loadLatestSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { db } from "@/src/server/db/db";
import { logger } from "@/src/lib/logger";
import { toErrorMessage } from "@/src/lib/utils";

const SNAPSHOT_LOCK_KEY = BigInt(917337);

type LockState = {
  source: SnapshotBuildSource;
  startedAt: Date;
};

type BuildRunState = {
  status: "idle" | "running" | "succeeded" | "failed";
  source?: SnapshotBuildSource;
  startedAt?: string;
  finishedAt?: string;
  error?: string | null;
  reused?: boolean;
};

let currentLock: LockState | null = null;
let lastRunState: BuildRunState = { status: "idle" };
let inProcessLock = false;
let lockSessionPid: number | null = null;

export class SnapshotBuildInProgressError extends Error {
  constructor(public readonly source: SnapshotBuildSource | "unknown", message = "Snapshot build already running") {
    super(message);
    this.name = "SnapshotBuildInProgressError";
  }
}

function isSnapshotFromToday(snapshotTime: Date | string): boolean {
  const now = new Date();
  const snapshotDate = new Date(snapshotTime);
  return (
    snapshotDate.getUTCFullYear() === now.getUTCFullYear() &&
    snapshotDate.getUTCMonth() === now.getUTCMonth() &&
    snapshotDate.getUTCDate() === now.getUTCDate()
  );
}

async function acquireLock(source: SnapshotBuildSource) {
  if (inProcessLock) {
    throw new SnapshotBuildInProgressError(currentLock?.source ?? "unknown");
  }
  const result = await db.execute<{ locked: boolean; pid: number }>(
    sql`select pg_try_advisory_lock(${SNAPSHOT_LOCK_KEY}) as locked, pg_backend_pid() as pid`,
  );
  const locked = Boolean(result[0]?.locked);
  if (!locked) {
    throw new SnapshotBuildInProgressError(currentLock?.source ?? "unknown");
  }
  inProcessLock = true;
  lockSessionPid = typeof result[0]?.pid === "number" ? result[0]?.pid : Number(result[0]?.pid ?? null) || null;
  currentLock = { source, startedAt: new Date() };
}

async function releaseLock() {
  const previousLock = currentLock;
  currentLock = null;
  if (!inProcessLock) {
    return;
  }
  inProcessLock = false;
  const expectedPid = lockSessionPid;
  lockSessionPid = null;
  try {
    if (expectedPid != null) {
      const pidResult = await db.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
      const currentPid = typeof pidResult[0]?.pid === "number" ? pidResult[0]?.pid : Number(pidResult[0]?.pid ?? null);
      if (currentPid && currentPid !== expectedPid) {
        logger.warn("Skipping advisory unlock because session changed", {
          expectedPid,
          currentPid,
          source: previousLock?.source,
        });
        return;
      }
    }
    const result = await db.execute<{ released: boolean }>(
      sql`select pg_advisory_unlock(${SNAPSHOT_LOCK_KEY}) as released`,
    );
    const released = Boolean(result[0]?.released);
    if (!released) {
      logger.warn("pg_advisory_unlock returned false", { source: previousLock?.source });
    }
  } catch (error) {
    logger.warn("Failed to release snapshot build lock", { error: toErrorMessage(error) });
  }
}

function updateRunState(patch: Partial<BuildRunState>) {
  lastRunState = { ...lastRunState, ...patch };
}

async function isLockedInAnotherProcess(): Promise<boolean> {
  if (currentLock) {
    return false;
  }
  try {
    const result = await db.execute<{ locked: boolean }>(
      sql`
        with attempt as (
          select pg_try_advisory_lock(${SNAPSHOT_LOCK_KEY}) as locked
        )
        select locked, case when locked then pg_advisory_unlock(${SNAPSHOT_LOCK_KEY}) else false end as released
        from attempt
      `,
    );
    const acquired = Boolean(result[0]?.locked);
    return !acquired;
  } catch (error) {
    logger.warn("Failed to read snapshot lock status", { error: toErrorMessage(error) });
    return false;
  }
}

export function getSnapshotSourceFromNotes(notes?: string | null): SnapshotBuildSource | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as { source?: SnapshotBuildSource };
    if (parsed && typeof parsed.source === "string") {
      return parsed.source as SnapshotBuildSource;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function getSnapshotBuildStatus(): Promise<{
  locked: boolean;
  source?: SnapshotBuildSource;
  startedAt?: string;
  expiresAt?: string;
  remainingMs?: number;
  state: BuildRunState;
}> {
  const locked = currentLock ? true : await isLockedInAnotherProcess();
  return {
    locked,
    source: currentLock?.source,
    startedAt: currentLock?.startedAt.toISOString(),
    expiresAt: undefined,
    remainingMs: undefined,
    state: lastRunState,
  };
}

export async function requestSnapshotBuild(params: {
  source: SnapshotBuildSource;
  force?: boolean;
}): Promise<{ snapshot: PerceptionSnapshotWithItems; reused: boolean }> {
  const latest = await loadLatestSnapshotFromStore();
  if (!params.force && latest && isSnapshotFromToday(latest.snapshot.snapshotTime)) {
    updateRunState({
      status: "succeeded",
      source: params.source,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      reused: true,
      error: null,
    });
    return { snapshot: latest, reused: true };
  }

  await acquireLock(params.source);
  updateRunState({
    status: "running",
    source: params.source,
    startedAt: new Date().toISOString(),
    finishedAt: undefined,
    error: null,
    reused: false,
  });
  try {
    const allowSync = params.source !== "ui";
    const snapshot = await buildAndStorePerceptionSnapshot({ source: params.source, allowSync });
    updateRunState({
      status: "succeeded",
      finishedAt: new Date().toISOString(),
      reused: false,
    });
    return { snapshot, reused: false };
  } catch (error) {
    updateRunState({
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: toErrorMessage(error),
    });
    throw error;
  } finally {
    await releaseLock();
  }
}

export async function __dangerouslyResetSnapshotBuildStateForTests(): Promise<void> {
  if (currentLock) {
    await releaseLock();
  }
  inProcessLock = false;
  lastRunState = { status: "idle" };
}
