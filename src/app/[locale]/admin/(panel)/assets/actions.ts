"use server";

import { revalidatePath } from "next/cache";
import { ensureAdminSession } from "@/src/lib/admin/guards";
import { createAsset, updateAsset, deleteAsset } from "@/src/server/repositories/assetRepository";
import { defaultLocale } from "@/i18n";

function parseLocale(formData: FormData): string {
  return (formData.get("locale") as string) || defaultLocale;
}

export async function createAssetAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  await createAsset({
    symbol: formData.get("symbol")?.toString() ?? "",
    displaySymbol: formData.get("displaySymbol")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    assetClass: formData.get("assetClass")?.toString() ?? "index",
    baseCurrency: formData.get("baseCurrency")?.toString() ?? null,
    quoteCurrency: formData.get("quoteCurrency")?.toString() ?? null,
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath(`/${locale}/admin/assets`);
}

export async function updateAssetAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("Asset-ID fehlt.");

  await updateAsset(id, {
    symbol: formData.get("symbol")?.toString() ?? undefined,
    displaySymbol: formData.get("displaySymbol")?.toString() ?? undefined,
    name: formData.get("name")?.toString() ?? undefined,
    assetClass: formData.get("assetClass")?.toString() ?? undefined,
    baseCurrency: formData.get("baseCurrency")?.toString() ?? undefined,
    quoteCurrency: formData.get("quoteCurrency")?.toString() ?? undefined,
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath(`/${locale}/admin/assets`);
  revalidatePath(`/${locale}/admin/assets/${id}`);
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  await ensureAdminSession();
  const locale = parseLocale(formData);
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("Asset-ID fehlt.");
  await deleteAsset(id);
  revalidatePath(`/${locale}/admin/assets`);
}
