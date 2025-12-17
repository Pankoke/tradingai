"use server";

import type { Locale } from "@/i18n";
import { i18nConfig } from "@/src/lib/i18n/config";
import { revalidatePath } from "next/cache";
import { enrichEventsAi } from "@/src/server/events/enrich/enrichEventsAi";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

export type EventsEnrichmentFormState = {
  ok: boolean | null;
  message?: string;
  error?: string;
};

const enrichmentLogger = logger.child({ module: "admin-events-enrichment-action" });
const MAX_LIMIT = 30;
const DEFAULT_DAYS_AHEAD = 14;

export async function triggerEventsEnrichmentAction(
  _prevState: EventsEnrichmentFormState,
  formData: FormData,
): Promise<EventsEnrichmentFormState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !i18nConfig.locales.includes(locale as Locale)) {
    return { ok: false, error: "Invalid locale" };
  }

  if (process.env.EVENTS_AI_ENRICH_ENABLED !== "1") {
    return { ok: false, error: "AI enrichment disabled via config" };
  }

  const limit = clampNumber(Number(process.env.EVENTS_AI_ENRICH_LIMIT ?? "15"), 1, MAX_LIMIT);
  const daysAhead = DEFAULT_DAYS_AHEAD;

  const startedAt = Date.now();
  try {
    const result = await enrichEventsAi({ limit, daysAhead });
    await createAuditRun({
      action: "events.enrich",
      source: "admin",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "admin_events_enrich_success",
      meta: {
        ...result,
        limit,
        daysAhead,
        triggeredBy: "admin",
      },
    });
    enrichmentLogger.info("admin triggered events enrichment", {
      durationMs: Date.now() - startedAt,
      limit,
      daysAhead,
      ...result,
    });
    revalidate(locale);
    return {
      ok: true,
      message: `Enriched ${result.enriched}, failed ${result.failed}, retries ${result.totalRetries}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await createAuditRun({
      action: "events.enrich",
      source: "admin",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "admin_events_enrich_failed",
      error: message,
    });
    enrichmentLogger.error("admin events enrichment failed", { error: message });
    return { ok: false, error: message };
  }
}

function revalidate(locale: string) {
  for (const loc of i18nConfig.locales) {
    revalidatePath(`/${loc}/events`);
  }
  revalidatePath(`/${locale}/admin/ops`);
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
