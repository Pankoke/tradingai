import type { Locale } from "@/i18n";
import type { OutcomesRelatedLink } from "@/src/components/admin/outcomes/OutcomesHeader";

const paths = {
  explorer: (locale: Locale) => `/${locale}/admin/outcomes`,
  overview: (locale: Locale) => `/${locale}/admin/outcomes/overview`,
  diagnostics: (locale: Locale) => `/${locale}/admin/outcomes/diagnostics`,
  engineHealth: (locale: Locale) => `/${locale}/admin/outcomes/engine-health`,
  swingPerformance: (locale: Locale) => `/${locale}/admin/outcomes/swing-performance`,
};

export function buildOutcomesRelatedLinks(locale: Locale, labels: Record<string, string>): OutcomesRelatedLink[] {
  return [
    { key: "explorer", label: labels.explorer, href: paths.explorer(locale) },
    { key: "overview", label: labels.overview, href: paths.overview(locale) },
    { key: "diagnostics", label: labels.diagnostics, href: paths.diagnostics(locale) },
    { key: "engineHealth", label: labels.engineHealth, href: paths.engineHealth(locale) },
    { key: "swingPerformance", label: labels.swingPerformance, href: paths.swingPerformance(locale) },
  ];
}
