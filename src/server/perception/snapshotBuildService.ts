import { sql } from "drizzle-orm";
import type { ReservedSql } from "postgres";
import { buildAndStorePerceptionSnapshot, type SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";
import { loadLatestSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";
import type { PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import { db, lockClient } from "@/src/server/db/db";
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
let hasDbLock = false;
let lockConnection: ReservedSql | null = null;
let lastRunState: BuildRunState = { status: "idle" };

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
  if (hasDbLock) {
    throw new SnapshotBuildInProgressError(currentLock?.source ?? "unknown");
  }
  const reserved = await lockClient.reserve();
  try {
    const result = await reserved.unsafe<Array<{ locked: boolean }>>(
      "select pg_try_advisory_lock($1) as locked",
      [Number(SNAPSHOT_LOCK_KEY)],
    );
    const locked = Boolean(result[0]?.locked);
    if (!locked) {
      await reserved.release();
      throw new SnapshotBuildInProgressError(currentLock?.source ?? "unknown");
    }
    lockConnection = reserved;
    hasDbLock = true;
    currentLock = { source, startedAt: new Date() };
  } catch (error) {
    try {
      reserved.release();
    } catch {
      // ignore
    }
    throw error;
  }
}

async function releaseLock() {
  const previousLock = currentLock;
  currentLock = null;
  const reserved = lockConnection;
  lockConnection = null;
  if (!hasDbLock || !reserved) {
    return;
  }
  hasDbLock = false;
  try {
    const result = await reserved.unsafe<Array<{ released: boolean }>>(
      "select pg_advisory_unlock($1) as released",
      [Number(SNAPSHOT_LOCK_KEY)],
    );
    const released = Boolean(result[0]?.released);
    if (!released) {
      logger.warn("pg_advisory_unlock returned false", { source: previousLock?.source });
    }
  } catch (error) {
    logger.warn("Failed to release snapshot build lock", { error: toErrorMessage(error) });
  } finally {
    try {
      reserved.release();
    } catch (releaseError) {
      logger.warn("Failed to release lock connection", { error: toErrorMessage(releaseError) });
    }
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
      sql`select pg_try_advisory_lock(${SNAPSHOT_LOCK_KEY}) as locked`,
    );
    const acquired = Boolean(result[0]?.locked);
    if (acquired) {
      await db.execute(sql`select pg_advisory_unlock(${SNAPSHOT_LOCK_KEY})`);
      return false;
    }
    return true;
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
    const snapshot = await buildAndStorePerceptionSnapshot({ source: params.source });
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
  hasDbLock = false;
  lastRunState = { status: "idle" };
}
