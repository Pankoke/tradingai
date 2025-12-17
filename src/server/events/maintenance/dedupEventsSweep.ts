import { inArray, eq } from "drizzle-orm";
import { logger } from "@/src/lib/logger";
import { db } from "@/src/server/db/db";
import { events } from "@/src/server/db/schema/events";
import {
  buildDedupKey,
  normalizeTitle,
  roundScheduledAt,
} from "@/src/server/events/ingest/ingestJbNewsCalendar";
import {
  listEventsForDedupSweep,
  type Event,
} from "@/src/server/repositories/eventRepository";

const dedupLogger = logger.child({ module: "events-dedup-sweep" });
const MAX_WINDOW_DAYS = 60;
const MAX_ROWS = 5000;

export type DedupEventsSweepParams = {
  daysBack?: number;
  daysAhead?: number;
  dryRun?: boolean;
};

export type DedupEventsSweepResult = {
  from: string;
  to: string;
  dryRun: boolean;
  totalCandidates: number;
  groupsProcessed: number;
  duplicatesFound: number;
  rowsDeleted: number;
  rowsUpdated: number;
  winnersKept: number;
  sampleGroups: Array<{ dedupKey: string; ids: string[] }>;
};

export async function dedupEventsSweep(params: DedupEventsSweepParams = {}): Promise<DedupEventsSweepResult> {
  const daysBack = clamp(params.daysBack ?? 7, 0, MAX_WINDOW_DAYS);
  const daysAhead = clamp(params.daysAhead ?? 21, 0, MAX_WINDOW_DAYS);
  const dryRun = params.dryRun ?? false;

  const now = Date.now();
  const from = new Date(now - daysBack * 24 * 60 * 60 * 1000);
  const to = new Date(now + daysAhead * 24 * 60 * 60 * 1000);

  const rows = await listEventsForDedupSweep({ from, to, limit: MAX_ROWS + 1 });
  if (rows.length > MAX_ROWS) {
    throw new Error(
      `Too many events (${rows.length}) in sweep window; reduce daysBack/daysAhead below ${MAX_WINDOW_DAYS} days`,
    );
  }

  const groups = groupEventsByKey(rows);
  const summary: DedupEventsSweepResult = {
    from: from.toISOString(),
    to: to.toISOString(),
    dryRun,
    totalCandidates: rows.length,
    groupsProcessed: 0,
    duplicatesFound: 0,
    rowsDeleted: 0,
    rowsUpdated: 0,
    winnersKept: 0,
    sampleGroups: [],
  };

  for (const [dedupKey, group] of groups) {
    if (group.length <= 1) continue;
    summary.groupsProcessed += 1;
    summary.duplicatesFound += group.length - 1;
    const { winner, losers } = selectWinner(group);
    summary.winnersKept += 1;
    if (summary.sampleGroups.length < 5) {
      summary.sampleGroups.push({ dedupKey, ids: group.map((event) => event.id) });
    }
    const mergedWinner = mergeGroupData(winner, losers);
    const requiresUpdate = hasDifferences(winner, mergedWinner);
    if (!dryRun) {
      await db.transaction(async (tx) => {
        if (requiresUpdate) {
          await tx
            .update(events)
            .set(buildUpdatePayload(mergedWinner))
            .where(eq(events.id, winner.id));
        }
        if (losers.length) {
          await tx.delete(events).where(inArray(events.id, losers.map((row) => row.id)));
        }
      });
    }
    if (requiresUpdate) {
      summary.rowsUpdated += 1;
    }
    if (losers.length) {
      summary.rowsDeleted += losers.length;
    }
  }

  dedupLogger.info("events dedup sweep summary", summary);
  return summary;
}

function groupEventsByKey(rows: Event[]): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();
  for (const row of rows) {
    const key = buildDedupKey({
      source: row.source,
      normalizedTitle: normalizeTitle(row.title),
      roundedDate: roundScheduledAt(row.scheduledAt),
      country: row.country ?? undefined,
    });
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

function selectWinner(group: Event[]): { winner: Event; losers: Event[] } {
  let winner = group[0];
  let bestScore = computeRichnessScore(winner);
  for (let i = 1; i < group.length; i += 1) {
    const candidate = group[i];
    const candidateScore = computeRichnessScore(candidate);
    if (candidateScore > bestScore) {
      winner = candidate;
      bestScore = candidateScore;
      continue;
    }
    if (candidateScore === bestScore) {
      const winnerUpdated = winner.updatedAt ? winner.updatedAt.getTime() : 0;
      const candidateUpdated = candidate.updatedAt ? candidate.updatedAt.getTime() : 0;
      if (candidateUpdated > winnerUpdated) {
        winner = candidate;
        bestScore = candidateScore;
        continue;
      }
      if (candidateUpdated === winnerUpdated) {
        if (candidate.scheduledAt.getTime() < winner.scheduledAt.getTime()) {
          winner = candidate;
          bestScore = candidateScore;
        }
      }
    }
  }
  const losers = group.filter((event) => event.id !== winner.id);
  return { winner, losers };
}

function mergeGroupData(winner: Event, candidates: Event[]): Event {
  const merged: Event = { ...winner };
  const everyone = [winner, ...candidates];

  for (const event of everyone) {
    merged.description = pickText(merged.description, event.description);
    merged.forecastValue = pickText(merged.forecastValue, event.forecastValue);
    merged.previousValue = pickText(merged.previousValue, event.previousValue);
    merged.actualValue = pickText(merged.actualValue, event.actualValue);
    merged.country = pickText(merged.country, event.country);
    merged.summary = pickText(merged.summary, event.summary);
    merged.marketScope = pickText(merged.marketScope, event.marketScope);
    merged.expectationLabel = pickText(merged.expectationLabel, event.expectationLabel);
    merged.expectationNote = pickText(merged.expectationNote, event.expectationNote);
    if (merged.expectationConfidence === null || merged.expectationConfidence === undefined) {
      merged.expectationConfidence = event.expectationConfidence ?? merged.expectationConfidence;
    }
    if (!merged.enrichedAt && event.enrichedAt) {
      merged.enrichedAt = event.enrichedAt;
    }
  }

  const earliestScheduled = everyone.reduce(
    (earliest, row) => (row.scheduledAt < earliest ? row.scheduledAt : earliest),
    winner.scheduledAt,
  );
  merged.scheduledAt = earliestScheduled;

  return merged;
}

function computeRichnessScore(event: Event): number {
  let score = 0;
  if (event.description) score += 1;
  if (event.forecastValue) score += 1;
  if (event.previousValue) score += 1;
  if (event.actualValue) score += 1;
  if (event.country) score += 1;
  if (event.summary) score += 2;
  if (event.marketScope) score += 1;
  if (event.enrichedAt) score += 2;
  return score;
}

function pickText<T extends string | null | undefined>(current: T, incoming: T): T {
  if (incoming === undefined || incoming === null || incoming === "") {
    return current;
  }
  if (!current || String(incoming).length > String(current).length) {
    return incoming;
  }
  return current;
}

function hasDifferences(original: Event, next: Event): boolean {
  const fields: Array<keyof Event> = [
    "description",
    "forecastValue",
    "previousValue",
    "actualValue",
    "country",
    "summary",
    "marketScope",
    "expectationLabel",
    "expectationNote",
    "expectationConfidence",
    "enrichedAt",
    "scheduledAt",
  ];
  return fields.some((field) => {
    const before = original[field];
    const after = next[field];
    if (before instanceof Date && after instanceof Date) {
      return before.getTime() !== after.getTime();
    }
    return (before ?? null) !== (after ?? null);
  });
}

function buildUpdatePayload(event: Event) {
  return {
    description: event.description ?? null,
    forecastValue: event.forecastValue ?? null,
    previousValue: event.previousValue ?? null,
    actualValue: event.actualValue ?? null,
    country: event.country ?? null,
    summary: event.summary ?? null,
    marketScope: event.marketScope ?? null,
    expectationLabel: event.expectationLabel ?? null,
    expectationConfidence: event.expectationConfidence ?? null,
    expectationNote: event.expectationNote ?? null,
    enrichedAt: event.enrichedAt ?? null,
    scheduledAt: event.scheduledAt,
    updatedAt: new Date(),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
