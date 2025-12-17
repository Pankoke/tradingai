import type { Event } from "@/src/server/repositories/eventRepository";

const HIGH_VALUE_CATEGORIES = new Set(["crypto", "onchain", "technical", "other"]);

export const CENTRAL_BANK_PATTERN =
  /(fomc|federal reserve|ecb|boe|boj|snb|press conference|rate decision|minutes|policy statement|central bank|speech)/i;

export const TIER1_MACRO_PATTERN = /(nonfarm|payroll|core cpi|headline cpi|cpi|gdp)/i;

export function shouldEnrichWithAi(event: Event): boolean {
  const impact = typeof event.impact === "number" ? event.impact : 0;
  if (impact < 2) {
    return false;
  }
  const category = (event.category ?? "").toLowerCase();
  if (HIGH_VALUE_CATEGORIES.has(category)) {
    return true;
  }
  const title = event.title ?? "";
  if (CENTRAL_BANK_PATTERN.test(title)) {
    return true;
  }
  if (impact >= 3 && TIER1_MACRO_PATTERN.test(title)) {
    return true;
  }
  return false;
}
