import type { PerceptionSnapshot } from "@/src/lib/engine/types";

let currentSnapshot: PerceptionSnapshot | null = null;

export function getPerceptionSnapshot(): PerceptionSnapshot | null {
  return currentSnapshot;
}

export function setPerceptionSnapshot(snapshot: PerceptionSnapshot): void {
  currentSnapshot = snapshot;
}
