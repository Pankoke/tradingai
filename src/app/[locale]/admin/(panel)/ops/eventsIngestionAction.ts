"use server";

import { revalidatePath } from "next/cache";
import { defaultLocale } from "@/i18n";
import { ensureAdminSession } from "@/src/lib/admin/guards";
import { logger } from "@/src/lib/logger";
import { ingestJbNewsCalendar } from "@/src/server/events/ingest/ingestJbNewsCalendar";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { i18nConfig } from "@/src/lib/i18n/config";

export type EventsIngestionFormState = {
  ok: boolean | null;
  message?: string;
  error?: string;
  result?: Awaited<ReturnType<typeof ingestJbNewsCalendar>>;
};

export async function triggerEventsIngestionAction(
  _prevState: EventsIngestionFormState,
  formData: FormData,
): Promise<EventsIngestionFormState> {
  await ensureAdminSession();
  const locale = formData.get("locale")?.toString() || defaultLocale;
  const startedAt = Date.now();
  try {
    const result = await ingestJbNewsCalendar();
    await createAuditRun({
      action: "events.ingest",
      source: "admin",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "admin_events_ingest_success",
      meta: result,
    });
    revalidatePath(`/${locale}/admin/ops`);
    revalidateEventsPages();
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

function revalidateEventsPages(): void {
  for (const locale of i18nConfig.locales) {
    revalidatePath(`/${locale}/events`);
  }
}
