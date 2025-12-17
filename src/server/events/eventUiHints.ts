import { CENTRAL_BANK_PATTERN } from "@/src/server/events/enrich/enrichmentRules";

export type EventIconToken = "inflation" | "centralBank" | "employment" | "growth" | "pmi" | "default";

const INFLATION_PATTERN = /(cpi|pce|ppi|inflation|deflator|price index)/i;
const EMPLOYMENT_PATTERN = /(payroll|nfp|jobless|unemployment|claims|employment rate)/i;
const GROWTH_PATTERN = /(gdp|retail sales|industrial production|factory orders|trade balance)/i;
const PMI_PATTERN = /(pmi|ism|purchasing managers|manufacturing index|services index)/i;

export function resolveEventIcon(title: string): EventIconToken {
  if (!title) {
    return "default";
  }
  if (INFLATION_PATTERN.test(title)) {
    return "inflation";
  }
  if (CENTRAL_BANK_PATTERN.test(title)) {
    return "centralBank";
  }
  if (EMPLOYMENT_PATTERN.test(title)) {
    return "employment";
  }
  if (GROWTH_PATTERN.test(title)) {
    return "growth";
  }
  if (PMI_PATTERN.test(title)) {
    return "pmi";
  }
  return "default";
}
