import { NextRequest } from "next/server";
import { respondFail } from "@/src/server/http/apiResponse";
import { getAllEvents } from "@/src/server/repositories/eventRepository";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron, type AdminOrCronAuthResult } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";
import { toCsv, type CsvPrimitive } from "@/src/lib/admin/csv/toCsv";

export const runtime = "nodejs";

const CSV_HEADERS = [
  "eventId",
  "providerId",
  "title",
  "category",
  "impact",
  "country",
  "source",
  "scheduledAt",
  "createdAt",
  "updatedAt",
] as const;

function toIsoOrEmpty(value: Date | null): string {
  return value instanceof Date ? value.toISOString() : "";
}

function toCsvRows(rows: Awaited<ReturnType<typeof getAllEvents>>): CsvPrimitive[][] {
  return rows.map((event) => [
    event.id,
    event.providerId,
    event.title,
    event.category,
    event.impact,
    event.country,
    event.source,
    toIsoOrEmpty(event.scheduledAt),
    toIsoOrEmpty(event.createdAt),
    toIsoOrEmpty(event.updatedAt),
  ]);
}

function buildFilename(prefix: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${prefix}-${day}.csv`;
}

async function writeExportAudit(params: {
  auth: AdminOrCronAuthResult;
  request: NextRequest;
  ok: boolean;
  rows?: number;
  bytes?: number;
  error?: unknown;
}): Promise<void> {
  await createAuditRun({
    action: "admin_events_export",
    source: params.auth.mode,
    ok: params.ok,
    message: params.ok ? "events_export_csv_success" : "events_export_csv_failed",
    error: params.error ? String(params.error) : null,
    meta: buildAuditMeta({
      auth: params.auth,
      request: { method: params.request.method, url: params.request.url },
      params: { format: "csv" },
      result: {
        ok: params.ok,
        rows: params.rows,
        bytes: params.bytes,
      },
      error: params.error,
    }),
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  let auth: AdminOrCronAuthResult;
  try {
    auth = await requireAdminOrCron(request, { allowCron: false, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  try {
    const events = await getAllEvents();
    const csvRows = toCsvRows(events);
    const body = toCsv([...CSV_HEADERS], csvRows);
    const bytes = Buffer.byteLength(body, "utf8");

    await writeExportAudit({
      auth,
      request,
      ok: true,
      rows: csvRows.length,
      bytes,
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildFilename("events")}"`,
      },
    });
  } catch (error) {
    await writeExportAudit({
      auth,
      request,
      ok: false,
      error,
    });
    return respondFail("INTERNAL_ERROR", "Failed to export events", 500);
  }
}
