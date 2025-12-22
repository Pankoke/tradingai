type AssetProfile = {
  assetClass: "fx" | "index" | "crypto" | "commodity" | "other";
  symbol: string;
};

type EventLike = {
  impact?: number | null;
  scheduledAt?: string | null;
  timeToEventMinutes?: number | null;
  country?: string | null;
  currency?: string | null;
  category?: string | null;
  marketScope?: string | null;
  title?: string | null;
};

const INDEX_DOMICILE: Record<string, string> = {
  "^GSPC": "US",
  "^SPX": "US",
  "^NDX": "US",
  "^IXIC": "US",
  "^GDAXI": "DE",
  dax: "DE",
  de40: "DE",
  "us-30": "US",
  "us-500": "US",
  "us-100": "US",
};

const FX_SAFE_MATCH = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "NZD", "CAD"];

const MARKET_SCOPE_BONUS: Record<string, number> = {
  CRYPTO: 0.8,
  GLOBAL: 0.6,
  FX_RATES_INDICES: 0.7,
  EQUITIES_INDICES: 0.7,
  COMMODITIES: 0.6,
};

const CRYPTO_US_BONUS = 0.1;
const GOLD_SYMBOL_PATTERNS = /(xau|gold|gc=|xauusd)/i;
const GOLD_THEMES = /(cpi|inflation|pce|fed|fomc|rate decision|central bank|nfp|employment|labor)/i;

export type EventRelevanceResult = {
  relevance: number;
  missingFields: string[];
  notes: string[];
};

export function computeEventRelevance(asset: AssetProfile, event: EventLike): EventRelevanceResult {
  const missingFields: string[] = [];
  const notes: string[] = [];
  if (!event.country) missingFields.push("country");
  if (asset.assetClass === "fx" && !event.currency) missingFields.push("currency");

  const baseScope = event.marketScope ? MARKET_SCOPE_BONUS[event.marketScope] ?? 0.4 : 0.4;
  const country = normalize(event.country);
  const currency = normalize(event.currency);

  let relevance = baseScope;
  const title = (event as { title?: string }).title ?? "";

  switch (asset.assetClass) {
    case "fx": {
      const legs = extractFxLegs(asset.symbol);
      if (currency && (legs.has(currency) || countryToCurrency(country) && legs.has(countryToCurrency(country)!))) {
        relevance = 1;
      } else if (country && legs.has(country)) {
        relevance = 0.9;
      } else {
        relevance = 0.35;
      }
      break;
    }
    case "index": {
      const domicile = resolveIndexDomicile(asset.symbol);
      if (country && domicile && country === domicile) {
        relevance = 0.9;
      } else if (country === "US" && domicile === "US") {
        relevance = 1;
      } else if (country === "US" && domicile && domicile !== "US") {
        relevance = 0.55;
      } else if (!country && domicile) {
        relevance = 0.5;
      } else {
        relevance = 0.4;
      }
      break;
    }
    case "crypto": {
      relevance = event.category?.toLowerCase().includes("crypto") ? 0.85 : 0.5 + (country === "US" ? CRYPTO_US_BONUS : 0);
      break;
    }
    case "commodity": {
      const isGold = GOLD_SYMBOL_PATTERNS.test(asset.symbol);
      if (isGold && GOLD_THEMES.test(`${event.category ?? ""} ${title}`)) {
        relevance = country === "US" ? 0.85 : 0.7;
      } else {
        relevance = country === "US" ? 0.6 : 0.5;
      }
      break;
    }
    default:
      relevance = 0.4;
  }

  if (missingFields.length >= 2) {
    relevance *= 0.75;
  }

  return { relevance: clamp01(relevance), missingFields, notes };
}

function extractFxLegs(symbol: string): Set<string> {
  const parts = symbol
    .replace("=X", "")
    .replace("/", "")
    .split(/[-]/);
  const legs: string[] = [];
  for (const part of parts) {
    if (part.length === 6 && FX_SAFE_MATCH.includes(part.slice(0, 3).toUpperCase())) {
      legs.push(part.slice(0, 3).toUpperCase(), part.slice(3, 6).toUpperCase());
    } else if (part.length === 3 && FX_SAFE_MATCH.includes(part.toUpperCase())) {
      legs.push(part.toUpperCase());
    }
  }
  return new Set(legs);
}

function normalize(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toUpperCase();
}

function countryToCurrency(country: string | null): string | null {
  if (!country) return null;
  if (country === "US") return "USD";
  if (country === "DE") return "EUR";
  if (country === "EU") return "EUR";
  if (country === "GB") return "GBP";
  if (country === "JP") return "JPY";
  if (country === "AU") return "AUD";
  if (country === "NZ") return "NZD";
  if (country === "CA") return "CAD";
  if (country === "CH") return "CHF";
  return null;
}

function resolveIndexDomicile(symbol: string): string | null {
  const normalized = symbol.toLowerCase();
  for (const [key, country] of Object.entries(INDEX_DOMICILE)) {
    if (normalized === key.toLowerCase()) return country;
  }
  if (normalized.includes("sp") || normalized.includes("nasdaq") || normalized.includes("ndx")) return "US";
  if (normalized.includes("dax") || normalized.includes("de")) return "DE";
  return null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
