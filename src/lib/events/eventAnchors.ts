import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

export function getEventAnchorId(eventId: string): string {
  return `event-${eventId}`;
}

export function getEventsAnchorHref(locale: Locale, eventId: string): string {
  return `/${locale}/events#${getEventAnchorId(eventId)}`;
}

export function getLocalePrefix(pathname: string | null | undefined): string {
  if (!pathname) {
    return `/${i18nConfig.defaultLocale}`;
  }
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  return i18nConfig.locales.includes(maybeLocale as Locale) ? `/${maybeLocale}` : `/${i18nConfig.defaultLocale}`;
}
