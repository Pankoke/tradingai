"use server";

import { revalidatePath } from "next/cache";
import { defaultLocale } from "@/i18n";
import { ensureAdminSession } from "@/src/lib/admin/guards";
import { logger } from "@/src/lib/logger";
import { ingestJbNewsCalendar } from "@/src/server/events/ingest/ingestJbNewsCalendar";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

export type EventsIngestionFormState = {
  ok: boolean | null;
  message?: string;
  error?: string;
  result?: Awaited<ReturnType<typeof ingestJbNewsCalendar>>;
};

const MAX_LOOKAHEAD = 60;

export async function triggerEventsIngestionAction(
  _prevState: EventsIngestionFormState,
  formData: FormData,
): Promise<EventsIngestionFormState> {
  await ensureAdminSession();
  const locale = formData.get("locale")?.toString() || defaultLocale;
  const lookaheadRaw = formData.get("lookaheadDays")?.toString();
  const lookaheadDays = parseLookahead(lookaheadRaw);
  const startedAt = Date.now();
  try {
    const result = await ingestJbNewsCalendar({ lookaheadDays });
    await createAuditRun({
      action: "events.ingest",
      source: "admin",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "admin_events_ingest_success",
      meta: result,
    });
    revalidatePath(`/${locale}/admin/ops`);
    return {
      ok: true,
      message: `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}`,
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Admin events ingestion failed", { error: message });
    await createAuditRun({
      action: "events.ingest",
      source: "admin",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "admin_events_ingest_failed",
      error: message,
    });
    return {
      ok: false,
      error: message,
    };
  }
}

function parseLookahead(raw?: string): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  if (parsed > MAX_LOOKAHEAD) {
    return MAX_LOOKAHEAD;
  }
  return parsed;
}
