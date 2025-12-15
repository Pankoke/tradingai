import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { logger } from "@/src/lib/logger";
import { isMissingTableError } from "@/src/lib/utils";
import { db } from "@/src/server/db/db";
import { events } from "@/src/server/db/schema/events";
import {
  JbNewsCalendarEvent,
  JbNewsCalendarProvider,
  JbNewsApiError,
  JbNewsConfigError,
} from "@/src/server/events/providers/jbNewsCalendarProvider";

type EventRow = typeof events.$inferSelect;
type EventInsert = typeof events.$inferInsert;
type PreparedEvent = EventInsert & {
  dedupKey: string;
  legacyId: string;
};

export type IngestResult = {
  imported: number;
  updated: number;
  skipped: number;
  from: string;
  to: string;
  source: "jb-news";
};

const DEFAULT_LOOKAHEAD_DAYS = 30;
const DEFAULT_IMPACT: number = 2;
const EVENT_ID_PREFIX = "evt-macro-jbnews-";
const DEDUP_ROUND_MINUTES = 5;
const MIN_IMPACT = resolveMinImpact();

const ingestionLogger = logger.child({ module: "jb-news-calendar-ingest" });

export async function ingestJbNewsCalendar(params?: {
  from?: Date;
  to?: Date;
  lookaheadDays?: number;
}): Promise<IngestResult> {
  const { from, to } = resolveRange(params);
  const provider = new JbNewsCalendarProvider();
  ingestionLogger.info("Starting jb-news calendar ingestion", {
    from: from.toISOString(),
    to: to.toISOString(),
  });

  let rawEvents: ReadonlyArray<JbNewsCalendarEvent>;
  try {
    rawEvents = await provider.fetchCalendar({ from, to });
  } catch (error) {
    ingestionLogger.error("jb-news calendar provider failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const prepared = rawEvents.map(mapEventToInsert);
  const filtered = prepared.filter((event) => {
    if (event.impact >= MIN_IMPACT) {
      return true;
    }
    ingestionLogger.debug("Filtered jb-news event below min impact", {
      title: event.title,
      impact: event.impact,
      minImpact: MIN_IMPACT,
    });
    return false;
  });
  const normalized = dedupeEvents(filtered);

  const filteredOut = prepared.length - filtered.length;
  const dedupedOut = filtered.length - normalized.length;

  try {
    const baseResult = await upsertEvents(normalized, from, to);
    const result = {
      ...baseResult,
      skipped: baseResult.skipped + filteredOut + dedupedOut,
    };
    ingestionLogger.info("Completed jb-news calendar ingestion", {
      ...result,
      from: result.from,
      to: result.to,
    });
    return {
      ...result,
      source: "jb-news",
    };
  } catch (error) {
    if (isMissingTableError(error, "events")) {
      ingestionLogger.warn("Events table missing, skipping jb-news ingestion");
      return {
        imported: 0,
        updated: 0,
        skipped: 0,
        from: from.toISOString(),
        to: to.toISOString(),
        source: "jb-news",
      };
    }
    if (error instanceof JbNewsApiError || error instanceof JbNewsConfigError) {
      throw error;
    }
    ingestionLogger.error("Failed to ingest jb-news calendar", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function resolveRange(params?: { from?: Date; to?: Date; lookaheadDays?: number }): { from: Date; to: Date } {
  const lookahead = params?.lookaheadDays ?? DEFAULT_LOOKAHEAD_DAYS;
  if (params?.from && params?.to) {
    return { from: params.from, to: params.to };
  }
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const resolvedFrom = params?.from ?? startOfTodayUtc;
  const resolvedTo = params?.to ?? new Date(resolvedFrom.getTime() + lookahead * 24 * 60 * 60 * 1000);
  return { from: resolvedFrom, to: resolvedTo };
}

async function upsertEvents(
  items: PreparedEvent[],
  from: Date,
  to: Date,
): Promise<Omit<IngestResult, "source">> {
  if (!items.length) {
    return { imported: 0, updated: 0, skipped: 0, from: from.toISOString(), to: to.toISOString() };
  }

  const idCandidates = Array.from(
    new Set(items.flatMap((item) => [item.id!, item.legacyId]).filter(Boolean)),
  );
  const existingRows = idCandidates.length
    ? await db.select().from(events).where(inArray(events.id, idCandidates))
    : [];
  const existingMap = new Map(existingRows.map((row) => [row.id, row]));

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = existingMap.get(item.id!) ?? existingMap.get(item.legacyId);
    if (!existing) {
      const { dedupKey: _dedup, legacyId: _legacy, ...dbValues } = item;
      await db.insert(events).values(dbValues);
      imported += 1;
      continue;
    }

    const { dedupKey: _d, legacyId: _l, ...dbValues } = item;
    const needsIdUpdate = existing.id !== item.id!;
    if (hasEventChanged(existing, dbValues as EventInsert) || needsIdUpdate) {
      await db
        .update(events)
        .set({ ...dbValues, id: item.id!, updatedAt: new Date() })
        .where(eq(events.id, existing.id));
      updated += 1;
      existingMap.set(item.id!, {
        ...existing,
        ...dbValues,
        id: item.id!,
        updatedAt: new Date(),
      });
    } else {
      skipped += 1;
    }
  }

  return {
    imported,
    updated,
    skipped,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function mapEventToInsert(event: JbNewsCalendarEvent): PreparedEvent {
  const scheduledAt = event.scheduledAt;
  const normalizedTitle = normalizeTitle(event.title);
  const dedupKey = buildDedupKey({
    source: event.source,
    normalizedTitle,
    roundedDate: roundScheduledAt(scheduledAt),
    currency: event.currency ?? undefined,
    country: event.country ?? undefined,
  });
  const id = buildEventIdFromKey(dedupKey);
  const legacyId = buildLegacyId(event.sourceId);
  return {
    id,
    legacyId,
    dedupKey,
    providerId: event.sourceId,
    title: formatDisplayTitle(event.title),
    description: event.description?.trim() || null,
    category: "macro",
    impact: typeof event.impact === "number" ? event.impact : DEFAULT_IMPACT,
    country: event.country ?? null,
    scheduledAt,
    actualValue: toTextValue(event.actual),
    previousValue: toTextValue(event.previous),
    forecastValue: toTextValue(event.forecast),
    affectedAssets: [],
    source: event.source,
  };
}

function buildEventIdFromKey(dedupKey: string): string {
  const hash = createHash("sha1").update(dedupKey).digest("hex");
  return `${EVENT_ID_PREFIX}${hash}`;
}

function buildLegacyId(sourceId: string): string {
  return `${EVENT_ID_PREFIX}${sourceId}`;
}

function dedupeEvents(eventsList: PreparedEvent[]): PreparedEvent[] {
  const map = new Map<string, PreparedEvent>();
  for (const event of eventsList) {
    const existing = map.get(event.dedupKey);
    if (!existing) {
      map.set(event.dedupKey, event);
      continue;
    }

    const existingScore = computeDedupScore(existing);
    const incomingScore = computeDedupScore(event);
    if (incomingScore > existingScore) {
      map.set(event.dedupKey, event);
      continue;
    }
    if (incomingScore === existingScore && event.scheduledAt! > existing.scheduledAt!) {
      map.set(event.dedupKey, event);
    }
  }
  return Array.from(map.values());
}

function computeDedupScore(event: PreparedEvent): number {
  let score = 0;
  if (event.actualValue) score += 2;
  if (event.forecastValue) score += 1;
  if (event.previousValue) score += 1;
  if (event.description) score += 1;
  return score;
}

function hasEventChanged(existing: EventRow, incoming: EventInsert): boolean {
  if (existing.title !== incoming.title) return true;
  if ((existing.description ?? null) !== (incoming.description ?? null)) return true;
  if (existing.category !== incoming.category) return true;
  if (existing.impact !== incoming.impact) return true;
  if ((existing.country ?? null) !== (incoming.country ?? null)) return true;
  if (existing.scheduledAt.getTime() !== incoming.scheduledAt!.getTime()) return true;
  if ((existing.actualValue ?? null) !== (incoming.actualValue ?? null)) return true;
  if ((existing.previousValue ?? null) !== (incoming.previousValue ?? null)) return true;
  if ((existing.forecastValue ?? null) !== (incoming.forecastValue ?? null)) return true;
  if (JSON.stringify(existing.affectedAssets ?? []) !== JSON.stringify(incoming.affectedAssets ?? [])) return true;
  if (existing.source !== incoming.source) return true;
  if ((existing.providerId ?? null) !== (incoming.providerId ?? null)) return true;
  return false;
}

function toTextValue(value: string | number | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "number" ? String(value) : value;
}

type DedupKeyParts = {
  source: string;
  normalizedTitle: string;
  roundedDate: Date;
  currency?: string;
  country?: string;
};

export function buildDedupKey(parts: DedupKeyParts): string {
  const components = [
    parts.source,
    parts.normalizedTitle,
    parts.roundedDate.toISOString(),
    parts.currency?.toLowerCase() ?? "",
    parts.country?.toLowerCase() ?? "",
  ];
  return components.join(":");
}

export function normalizeTitle(title: string): string {
  const collapsed = collapseWhitespace(title);
  const deduped = collapsed.replace(/([^\w\s])\1+/g, "$1");
  return deduped.toLowerCase();
}

export function formatDisplayTitle(title: string): string {
  const collapsed = collapseWhitespace(title);
  return collapsed.replace(/\s+([!?,.;:])/g, "$1");
}

export function roundScheduledAt(date: Date): Date {
  const intervalMs = DEDUP_ROUND_MINUTES * 60 * 1000;
  const rounded = Math.round(date.getTime() / intervalMs) * intervalMs;
  return new Date(rounded);
}

export function resolveMinImpact(rawValue = process.env.EVENTS_INGEST_MIN_IMPACT): number {
  if (!rawValue) {
    return 1;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3) {
    logger.warn("Invalid EVENTS_INGEST_MIN_IMPACT value, falling back to 1", {
      value: rawValue,
    });
    return 1;
  }
  return parsed;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
