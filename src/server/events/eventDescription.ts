import type { Event } from "@/src/server/repositories/eventRepository";

export const MARKET_SCOPE_ENUM = {
  FX_RATES_INDICES: "FX_RATES_INDICES",
  EQUITIES_INDICES: "EQUITIES_INDICES",
  COMMODITIES: "COMMODITIES",
  CRYPTO: "CRYPTO",
  GLOBAL: "GLOBAL",
  UNKNOWN: "UNKNOWN",
} as const;

export type MarketScopeEnum = keyof typeof MARKET_SCOPE_ENUM;

type DescriptionResult = {
  summary: string;
  marketScope: MarketScopeEnum;
};

const MARKET_SCOPE_LABELS: Record<MarketScopeEnum, string> = {
  FX_RATES_INDICES: "FX, Rates, Indices",
  EQUITIES_INDICES: "Equities, Indices",
  COMMODITIES: "Commodities",
  CRYPTO: "Crypto",
  GLOBAL: "Global",
  UNKNOWN: "Global",
};

type PatternRule = {
  match: RegExp;
  summary: string;
  scope?: MarketScopeEnum;
};

const DEFAULT_SUMMARY = "Scheduled macro release; may increase volatility around the release time.";

const MARKET_SCOPE_BY_CATEGORY: Record<string, MarketScopeEnum> = {
  macro: "FX_RATES_INDICES",
  crypto: "CRYPTO",
  onchain: "CRYPTO",
  technical: "EQUITIES_INDICES",
  other: "GLOBAL",
};

const PATTERN_RULES: PatternRule[] = [
  {
    match: /core?\s*cpi.*y\/y/i,
    summary: "Annual inflation rate reading; a direct input for rate expectations and USD volatility.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /core?\s*cpi.*m\/m/i,
    summary: "Monthly inflation momentum; shifts expectations for near-term hikes and FX swings.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /core?\s*pce/i,
    summary: "Fed's preferred inflation gauge; guides policy path and Treasury yields.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /gdp/i,
    summary: "Growth snapshot; surprises move equity risk appetite and yields.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /retail sales/i,
    summary: "Household demand pulse; affects growth outlook and USD strength.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /pmi|ism/i,
    summary: "Business activity indicator; can shift growth expectations and risk sentiment.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /nonfarm|payroll|employment change/i,
    summary: "Labor market update; high impact on rates, FX and equity futures.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /jobless|unemployment claims/i,
    summary: "Weekly labor claims; early signal for growth momentum.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /rate decision|interest rate|fomc|ecb|boe|boj/i,
    summary: "Central-bank policy decision; drives rates volatility and cross-asset positioning.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /minutes/i,
    summary: "Central-bank minutes; details on policy bias and future guidance.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /ppi/i,
    summary: "Producer-price pressure; leading input for CPI and margins.",
    scope: "FX_RATES_INDICES",
  },
  {
    match: /confidence|sentiment/i,
    summary: "Survey-based sentiment; early signal for spending and risk appetite.",
    scope: "EQUITIES_INDICES",
  },
];

export function buildEventDescription(event: Pick<Event, "title" | "category">): DescriptionResult {
  const categoryKey = (event.category ?? "other").toLowerCase();
  const scope = MARKET_SCOPE_BY_CATEGORY[categoryKey] ?? MARKET_SCOPE_BY_CATEGORY.other;
  const rule = PATTERN_RULES.find((entry) => entry.match.test(event.title));
  return {
    summary: rule?.summary ?? DEFAULT_SUMMARY,
    marketScope: rule?.scope ?? scope,
  };
}

export function resolveEventEnrichment(event: Event): { summary: string; marketScope: string } {
  const fallback = buildEventDescription(event);
  const storedScope = normalizeScope(event.marketScope);
  const finalScope = storedScope !== "UNKNOWN" ? storedScope : fallback.marketScope;
  const summary = event.summary?.trim() || fallback.summary;
  return {
    summary,
    marketScope: renderScope(finalScope),
  };
}

function normalizeScope(raw?: string | null): MarketScopeEnum {
  if (!raw) {
    return "UNKNOWN";
  }
  const upper = raw
    .toUpperCase()
    .replace(/[^A-Z]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (MARKET_SCOPE_ENUM as Record<string, MarketScopeEnum>)[upper] ?? "UNKNOWN";
}

function renderScope(scope: MarketScopeEnum): string {
  return MARKET_SCOPE_LABELS[scope] ?? MARKET_SCOPE_LABELS.UNKNOWN;
}
