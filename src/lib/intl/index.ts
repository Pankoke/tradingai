import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type Messages = Record<string, string>;

const cache = new Map<Locale, Messages>();

export function isSupportedLocale(candidate: string): candidate is Locale {
  return (i18nConfig.locales as readonly string[]).includes(candidate);
}

export function resolveLocale(candidate?: string | null): Locale {
  if (candidate && isSupportedLocale(candidate)) {
    return candidate;
  }
  return i18nConfig.defaultLocale;
}

export async function loadLocaleMessages(locale: Locale): Promise<Messages> {
  if (cache.has(locale)) {
    return cache.get(locale)!;
  }

  const messages = (await import(`@/src/messages/${locale}.json`)).default as Messages;
  cache.set(locale, messages);
  return messages;
}

export function getSupportedLocales(): Locale[] {
  return [...i18nConfig.locales];
}

export function getDefaultLocale(): Locale {
  return i18nConfig.defaultLocale;
}

export type { Locale };
