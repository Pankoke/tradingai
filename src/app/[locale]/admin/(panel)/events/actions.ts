"use server";

import { revalidatePath } from "next/cache";
import { ensureAdminSession } from "@/src/lib/admin/guards";
import { createEvent, updateEvent, deleteEvent } from "@/src/server/repositories/eventRepository";
import { defaultLocale } from "@/i18n";

function parseLocale(formData: FormData): string {
  return (formData.get("locale") as string) || defaultLocale;
}

function parseAffectedAssets(raw: FormDataEntryValue | null): Record<string, unknown> | null {
  if (!raw) return null;
  const text = raw.toString().trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function createEventAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  const impact = Number(formData.get("impact") ?? 0);
  const scheduledAtRaw = formData.get("scheduledAt")?.toString() ?? "";
  await createEvent({
    title: formData.get("title")?.toString() ?? "Untitled",
    category: formData.get("category")?.toString() ?? "misc",
    impact: Number.isFinite(impact) ? impact : 0,
    scheduledAt: new Date(scheduledAtRaw),
    source: formData.get("source")?.toString() ?? "manual",
    providerId: formData.get("providerId")?.toString() ?? null,
    description: formData.get("description")?.toString() ?? null,
    country: formData.get("country")?.toString() ?? null,
    affectedAssets: parseAffectedAssets(formData.get("affectedAssets")),
    actualValue: null,
    previousValue: null,
    forecastValue: null,
  });
  revalidatePath(`/${locale}/admin/events`);
}

export async function updateEventAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  const id = formData.get("id")?.toString();
  if (!id) {
    throw new Error("Event-ID fehlt.");
  }
  const impact = Number(formData.get("impact") ?? 0);
  await updateEvent(id, {
    title: formData.get("title")?.toString() ?? undefined,
    category: formData.get("category")?.toString() ?? undefined,
    impact: Number.isFinite(impact) ? impact : undefined,
    scheduledAt: formData.get("scheduledAt") ? new Date(formData.get("scheduledAt")!.toString()) : undefined,
    source: formData.get("source")?.toString() ?? undefined,
    providerId: formData.get("providerId")?.toString() ?? undefined,
    description: formData.get("description")?.toString() ?? undefined,
    country: formData.get("country")?.toString() ?? undefined,
    affectedAssets: parseAffectedAssets(formData.get("affectedAssets")) ?? undefined,
  });
  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/admin/events/${id}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  const id = formData.get("id")?.toString();
  if (!id) {
    throw new Error("Event-ID fehlt.");
  }
  await deleteEvent(id);
  revalidatePath(`/${locale}/admin/events`);
}
