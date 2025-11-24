export const locales = ["de", "en"] as const;
export const defaultLocale = "de" as const;

const i18nConfig = {
  locales,
  defaultLocale,
};

export type Locale = (typeof locales)[number];

export default i18nConfig;
