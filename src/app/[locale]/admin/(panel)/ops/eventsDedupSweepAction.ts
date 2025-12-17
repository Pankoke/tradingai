"use server";

import type { Locale } from "@/i18n";
import { i18nConfig } from "@/src/lib/i18n/config";
import { revalidatePath } from "next/cache";
import { dedupEventsSweep } from "@/src/server/events/maintenance/dedupEventsSweep";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

export type EventsDedupSweepFormState = {
  ok: boolean | null;
  message?: string;
  error?: string;
};

const dedupActionLogger = logger.child({ module: "admin-events-dedup-sweep-action" });
const MAX_DAYS = 60;

export async function triggerEventsDedupSweepAction(
  _prevState: EventsDedupSweepFormState,
  formData: FormData,
): Promise<EventsDedupSweepFormState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !i18nConfig.locales.includes(locale as Locale)) {
    return { ok: false, error: "Invalid locale" };
  }

  const daysBack = clamp(Number(formData.get("daysBack") ?? "7"), 0, MAX_DAYS);
  const daysAhead = clamp(Number(formData.get("daysAhead") ?? "21"), 0, MAX_DAYS);
  const dryRun = formData.get("dryRun") === "on";

  const startedAt = Date.now();
  try {
    const result = await dedupEventsSweep({ daysBack, daysAhead, dryRun });
    await createAuditRun({
      action: "events.dedup_sweep",
      source: "admin",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: dryRun ? "admin_events_dedup_dryrun" : "admin_events_dedup_success",
      meta: {
        ...result,
        daysBack,
        daysAhead,
      },
    });
    dedupActionLogger.info("admin dedup sweep completed", {
      durationMs: Date.now() - startedAt,
      daysBack,
      daysAhead,
      ...result,
    });
    revalidateAll(locale);
    return {
      ok: true,
      message: `Groups ${result.groupsProcessed}, deleted ${result.rowsDeleted}, updated ${result.rowsUpdated}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await createAuditRun({
      action: "events.dedup_sweep",
      source: "admin",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "admin_events_dedup_failed",
      error: message,
      meta: {
        daysBack,
        daysAhead,
        dryRun,
      },
    });
    dedupActionLogger.error("admin dedup sweep failed", { error: message });
    return { ok: false, error: message };
  }
}

function revalidateAll(locale: string) {
  for (const loc of i18nConfig.locales) {
    revalidatePath(`/${loc}/events`);
  }
  revalidatePath(`/${locale}/admin/ops`);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
