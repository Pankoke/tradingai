import type { Locale } from "@/i18n";
import type { OutcomesRelatedLink } from "@/src/components/admin/outcomes/OutcomesHeader";
import { buildSectionRelatedLinks } from "@/src/components/admin/relatedLinks";

export type OutcomesRelatedLabels = {
  explorer: string;
  overview: string;
  diagnostics: string;
  engineHealth: string;
  swingPerformance: string;
};

export function buildOutcomesRelatedLinks(locale: Locale, labels: OutcomesRelatedLabels): OutcomesRelatedLink[] {
  return buildSectionRelatedLinks({
    section: "outcomes",
    locale,
    labels,
    fallbackActiveKey: "explorer",
  }).links;
}
