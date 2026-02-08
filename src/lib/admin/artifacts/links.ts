import type { Locale } from "@/i18n";
import type { ArtifactTypeId } from "@/src/lib/admin/artifacts/registry";

export function buildArtifactsHref(locale: Locale, type?: ArtifactTypeId | null): string {
  const base = `/${locale}/admin/artifacts`;
  if (!type) return base;
  return `${base}?type=${encodeURIComponent(type)}`;
}
