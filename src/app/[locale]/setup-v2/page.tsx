import { notFound, redirect } from "next/navigation";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

export default async function SetupV2IndexPage({ params }: PageProps): Promise<never> {
  const resolvedParams = await params;
  const localeParam = resolvedParams.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;

  const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
  const latest = await snapshotStore.loadLatestSnapshotFromStore();

  if (!latest || latest.setups.length === 0) {
    notFound();
  }

  const setupId = latest.setups[0]?.id;
  if (!setupId) {
    notFound();
  }

  redirect(`/${locale}/setup-v2/${setupId}`);
}
