import { buildImportPreviewHash } from "@/src/lib/admin/import/previewHash";
import type { ImportApplyResult, ImportPreviewResult, ImportRowPreview, ImportSummary } from "@/src/lib/admin/import/types";
import { parseCsvToObjects } from "@/src/lib/admin/csv/parseCsv";
import {
  createEvent,
  getEventsByIds,
  updateEvent,
  type Event,
} from "@/src/server/repositories/eventRepository";

const EVENT_ALLOWED_COLUMNS = new Set([
  "eventId",
  "id",
  "title",
  "name",
  "category",
  "impact",
  "country",
  "source",
  "timestamp",
  "scheduledAt",
  "description",
]);

type EventPatch = Partial<{
  title: string;
  category: string;
  impact: number;
  country: string | null;
  source: string;
  scheduledAt: Date;
  description: string | null;
}>;

type EventOperation =
  | { status: "error"; rowIndex: number; key: string; message: string }
  | { status: "skip"; rowIndex: number; key: string; message?: string }
  | {
      status: "create";
      rowIndex: number;
      key: string;
      createInput: {
        id: string;
        title: string;
        category: string;
        impact: number;
        scheduledAt: Date;
        source: string;
        country: string | null;
        description: string | null;
        providerId: string | null;
        affectedAssets: null;
        actualValue: null;
        previousValue: null;
        forecastValue: null;
      };
      changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
    }
  | {
      status: "update";
      rowIndex: number;
      key: string;
      eventId: string;
      updateInput: EventPatch;
      changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
    };

type PreparedEventsImport = {
  summary: ImportSummary;
  rowsPreview: ImportRowPreview[];
  operations: EventOperation[];
  previewHash: string;
};

function clean(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseImpact(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw.trim());
  if (!Number.isFinite(date.getTime())) return undefined;
  return date;
}

function toPreviewRow(operation: EventOperation): ImportRowPreview {
  if (operation.status === "create" || operation.status === "update") {
    return {
      rowIndex: operation.rowIndex,
      key: operation.key,
      status: operation.status,
      changes: operation.changes,
    };
  }
  return {
    rowIndex: operation.rowIndex,
    key: operation.key,
    status: operation.status,
    message: operation.message,
  };
}

function diffEvent(existing: Event | null, patch: Record<string, unknown>): Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> {
  const changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> = {};
  for (const [field, nextValue] of Object.entries(patch)) {
    const currentValue = existing ? (existing as unknown as Record<string, unknown>)[field] : null;
    const nextComparable = nextValue instanceof Date ? nextValue.toISOString() : nextValue;
    const currentComparable = currentValue instanceof Date ? currentValue.toISOString() : currentValue;
    if (currentComparable === nextComparable) continue;
    changes[field] = {
      from:
        typeof currentComparable === "string" || typeof currentComparable === "number" || typeof currentComparable === "boolean" || currentComparable === null
          ? currentComparable
          : String(currentComparable ?? ""),
      to:
        typeof nextComparable === "string" || typeof nextComparable === "number" || typeof nextComparable === "boolean" || nextComparable === null
          ? nextComparable
          : String(nextComparable ?? ""),
    };
  }
  return changes;
}

async function prepareEventsImport(csvText: string): Promise<PreparedEventsImport> {
  const parsed = parseCsvToObjects(csvText);
  const ignoredColumns = parsed.headers.filter((header) => header && !EVENT_ALLOWED_COLUMNS.has(header));
  const previewHash = buildImportPreviewHash({ entityType: "events", csvText, mode: "preview" });

  const idKeys = new Set<string>();
  for (const row of parsed.rows) {
    const id = clean(row.eventId ?? row.id);
    if (id) idKeys.add(id);
  }

  const existingRows = await getEventsByIds([...idKeys]);
  const existingById = new Map(existingRows.map((event) => [event.id, event]));
  const operations: EventOperation[] = [];

  parsed.rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const eventId = clean(row.eventId ?? row.id);
    const key = eventId ?? `row-${rowIndex}`;
    if (!eventId) {
      operations.push({ status: "error", rowIndex, key, message: "Missing key: eventId/id is required" });
      return;
    }

    const existing = existingById.get(eventId) ?? null;
    const patch: EventPatch = {};
    const title = clean(row.title ?? row.name);
    if (title) patch.title = title;
    const category = clean(row.category);
    if (category) patch.category = category;
    const source = clean(row.source);
    if (source) patch.source = source;
    const country = clean(row.country);
    if (row.country !== undefined) patch.country = country ?? null;
    const description = clean(row.description);
    if (row.description !== undefined) patch.description = description ?? null;

    const impactRaw = clean(row.impact);
    if (impactRaw) {
      const impact = parseImpact(impactRaw);
      if (impact === undefined) {
        operations.push({ status: "error", rowIndex, key, message: "Invalid impact value" });
        return;
      }
      patch.impact = impact;
    }

    const scheduledAtRaw = clean(row.scheduledAt ?? row.timestamp);
    if (scheduledAtRaw) {
      const scheduledAt = parseDate(scheduledAtRaw);
      if (!scheduledAt) {
        operations.push({ status: "error", rowIndex, key, message: "Invalid scheduledAt/timestamp value" });
        return;
      }
      patch.scheduledAt = scheduledAt;
    }

    if (!existing) {
      if (!patch.title || !patch.category || patch.impact === undefined || !patch.scheduledAt || !patch.source) {
        operations.push({
          status: "error",
          rowIndex,
          key,
          message: "Create requires title/name, category, impact, scheduledAt/timestamp and source",
        });
        return;
      }
      const createInput = {
        id: eventId,
        title: patch.title,
        category: patch.category,
        impact: patch.impact,
        scheduledAt: patch.scheduledAt,
        source: patch.source,
        country: patch.country ?? null,
        description: patch.description ?? null,
        providerId: null,
        affectedAssets: null,
        actualValue: null,
        previousValue: null,
        forecastValue: null,
      };
      operations.push({
        status: "create",
        rowIndex,
        key,
        createInput,
        changes: diffEvent(null, createInput),
      });
      return;
    }

    const changes = diffEvent(existing, patch);
    if (!Object.keys(changes).length) {
      operations.push({ status: "skip", rowIndex, key, message: "No changes detected" });
      return;
    }
    operations.push({
      status: "update",
      rowIndex,
      key,
      eventId,
      updateInput: patch,
      changes,
    });
  });

  const summary: ImportSummary = {
    rowsTotal: parsed.rows.length,
    creates: operations.filter((op) => op.status === "create").length,
    updates: operations.filter((op) => op.status === "update").length,
    skips: operations.filter((op) => op.status === "skip").length,
    errors: operations.filter((op) => op.status === "error").length,
    ignoredColumns,
  };

  return {
    summary,
    rowsPreview: operations.slice(0, 50).map((operation) => toPreviewRow(operation)),
    operations,
    previewHash,
  };
}

export async function previewEventsImport(csvText: string): Promise<ImportPreviewResult> {
  const prepared = await prepareEventsImport(csvText);
  return {
    summary: prepared.summary,
    rowsPreview: prepared.rowsPreview,
    previewHash: prepared.previewHash,
  };
}

export async function applyEventsImport(params: {
  csvText: string;
  previewHash: string;
}): Promise<ImportApplyResult> {
  const prepared = await prepareEventsImport(params.csvText);
  if (prepared.previewHash !== params.previewHash) {
    throw new Error("PREVIEW_MISMATCH");
  }
  if (prepared.summary.errors > 0) {
    throw new Error("PREVIEW_HAS_ERRORS");
  }

  for (const operation of prepared.operations) {
    if (operation.status === "create") {
      await createEvent(operation.createInput);
    } else if (operation.status === "update") {
      await updateEvent(operation.eventId, operation.updateInput);
    }
  }

  return { summary: prepared.summary };
}
