import { buildAndStorePerceptionSnapshot, type SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";
import { getLatestSnapshot, type PerceptionSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

type LockState = {
  source: SnapshotBuildSource;
  startedAt: number;
  expiresAt: number;
};

let currentLock: LockState | null = null;

export class SnapshotBuildInProgressError extends Error {
  constructor(public readonly source: SnapshotBuildSource, message = "Snapshot build already running") {
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

function cleanupLockIfExpired() {
  if (currentLock && Date.now() > currentLock.expiresAt) {
    currentLock = null;
  }
}

async function acquireLock(source: SnapshotBuildSource) {
  cleanupLockIfExpired();
  if (currentLock) {
    throw new SnapshotBuildInProgressError(currentLock.source);
  }
  const now = Date.now();
  currentLock = { source, startedAt: now, expiresAt: now + LOCK_TIMEOUT_MS };
}

function releaseLock() {
  currentLock = null;
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

export function getSnapshotBuildStatus(): {
  locked: boolean;
  source?: SnapshotBuildSource;
  startedAt?: string;
  expiresAt?: string;
  remainingMs?: number;
} {
  cleanupLockIfExpired();
  if (!currentLock) {
    return { locked: false };
  }
  return {
    locked: true,
    source: currentLock.source,
    startedAt: new Date(currentLock.startedAt).toISOString(),
    expiresAt: new Date(currentLock.expiresAt).toISOString(),
    remainingMs: Math.max(0, currentLock.expiresAt - Date.now()),
  };
}

export async function requestSnapshotBuild(params: {
  source: SnapshotBuildSource;
  force?: boolean;
}): Promise<{ snapshot: PerceptionSnapshotWithItems; reused: boolean }> {
  const latest = await getLatestSnapshot();
  if (!params.force && latest && isSnapshotFromToday(latest.snapshot.snapshotTime)) {
    return { snapshot: latest, reused: true };
  }

  await acquireLock(params.source);
  try {
    const snapshot = await buildAndStorePerceptionSnapshot({ source: params.source });
    return { snapshot, reused: false };
  } finally {
    releaseLock();
  }
}
