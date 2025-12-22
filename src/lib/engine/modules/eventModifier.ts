import type { EventModifier } from "@/src/lib/engine/types";
import type { Setup } from "@/src/lib/engine/types";
import { computeEventRelevance } from "@/src/lib/engine/modules/eventRelevance";

type BuildParams = {
  context?: Setup["eventContext"] | null;
  setup?: Pick<Setup, "symbol" | "timeframe" | "category">;
  now?: Date;
};

const IMPACT_WEIGHT: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1 };
const SOURCE_WEIGHT: Record<string, number> = {
  "jb-news": 0.8,
};

type WindowRule = { execution: number; context: number };
const WINDOW_RULES: Record<"intraday" | "daily" | "swing" | "unknown", WindowRule> = {
  intraday: { execution: 60, context: 360 },
  daily: { execution: 120, context: 2880 }, // 48h context for 1D
  swing: { execution: 240, context: 4320 }, // 72h context for swing
  unknown: { execution: 90, context: 480 },
};

type AssetClass = "fx" | "index" | "crypto" | "commodity" | "other";

export function buildEventModifier(params: BuildParams): EventModifier {
  const now = params.now ?? new Date();
  const ctx = params.context;
  const events = ctx?.topEvents ?? [];
  const eventCount = ctx?.eventCount ?? events.length ?? 0;
  if (!eventCount) {
    return {
      classification: "none",
      primaryEvent: undefined,
      quality: { usedGlobalFallback: ctx?.notes?.includes("hash_fallback") ?? false },
    };
  }

  const assetProfile = {
    assetClass: resolveAssetClass(params.setup?.symbol ?? "", params.setup?.category),
    symbol: params.setup?.symbol ?? "",
  };
  const timeframeKind = classifyTimeframe(params.setup?.timeframe);
  const windowRule = WINDOW_RULES[timeframeKind];

  const ranked = events
    .map((event) => {
      const minutesToEvent = resolveMinutesToEvent(event, now);
      const relevance = computeEventRelevance(assetProfile, {
        country: (event as { country?: string | null }).country ?? null,
        currency: (event as { currency?: string | null }).currency ?? null,
        impact: event.impact,
        scheduledAt: event.scheduledAt,
        timeToEventMinutes: minutesToEvent,
        category: event.category,
        marketScope: (event as { marketScope?: string | null }).marketScope ?? null,
      });
      const proximityWeight = deriveProximityWeight(minutesToEvent, windowRule, timeframeKind);
      const impactWeight = IMPACT_WEIGHT[event.impact ?? 1] ?? 0.6;
      const reliability = computeReliability(event, relevance.missingFields);
      const reliabilityWeight = reliability.weight;
      const sessionPenalty = isOutsideSession(assetProfile.assetClass, event.scheduledAt, now) ? 0.6 : 1;
      const priority = relevance.relevance * impactWeight * proximityWeight * reliabilityWeight * sessionPenalty;
      const outsideSession = sessionPenalty < 1;
      return { event, minutesToEvent, relevance, priority, outsideSession, proximityWeight, reliabilityWeight };
    })
    .sort((a, b) => b.priority - a.priority);

  const winner = ranked[0];
  if (!winner) {
    return { classification: "none", primaryEvent: undefined, quality: { usedGlobalFallback: false } };
  }

  const classification = classifyModifier(winner, windowRule, timeframeKind);

  const surprise = computeSurprise(winner, now, windowRule.execution);
  const rationale = buildRationale(classification, winner, ctx);
  if (surprise) {
    rationale.push(`Surprise: ${surprise.label}`);
  }
  const executionAdjustments = buildAdjustments(classification, winner, surprise);

  return {
    classification,
    primaryEvent: {
      title: winner.event.title,
      scheduledAt: winner.event.scheduledAt,
      impact: winner.event.impact,
      minutesToEvent: winner.minutesToEvent,
      source: winner.event.source,
      country: (winner.event as { country?: string }).country,
      currency: (winner.event as { currency?: string }).currency,
      category: winner.event.category,
    },
    rationale: rationale.length ? rationale.slice(0, 3) : undefined,
    executionAdjustments: executionAdjustments.slice(0, 4),
    reliabilityWeight: winner.reliabilityWeight,
    surprise: surprise ?? undefined,
    quality: {
      usedGlobalFallback: ctx?.notes?.some((n) => n === "hash_fallback" || n === "events_db_unavailable") ?? false,
      missingFields: winner.relevance.missingFields.length ? winner.relevance.missingFields : undefined,
      reliabilityBucket: computeReliability(winner.event, winner.relevance.missingFields).bucket,
    },
  };
}

function shorten(value: string, max = 48): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function classifyTimeframe(raw?: string): "intraday" | "daily" | "swing" | "unknown" {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (/\b(min|m|minute|hour|h)\b/.test(lower) || /\d+\s*(m|h)\b/.test(lower)) return "intraday";
  if (/\b(day|daily|1d|d1)\b/.test(lower) || /d$/.test(lower)) return "daily";
  if (/\b(week|wk|swing)\b/.test(lower) || /\d+\s*w\b/.test(lower)) return "swing";
  return "unknown";
}

function resolveMinutesToEvent(event: { timeToEventMinutes?: number | null; scheduledAt?: string | null }, now: Date) {
  if (typeof event.timeToEventMinutes === "number") return event.timeToEventMinutes;
  if (event.scheduledAt) {
    return Math.round((new Date(event.scheduledAt).getTime() - now.getTime()) / 60000);
  }
  return null;
}

function deriveProximityWeight(
  minutesToEvent: number | null,
  windowRule: WindowRule,
  timeframe: keyof typeof WINDOW_RULES,
): number {
  if (minutesToEvent === null) return 0.3;
  const absMins = Math.abs(minutesToEvent);
  if (absMins <= windowRule.execution) return 1;
  if (absMins <= windowRule.context) return timeframe === "intraday" ? 0.7 : 0.65;
  return 0.35;
}

function classifyModifier(
  winner: {
    minutesToEvent: number | null;
    relevance: { relevance: number };
    event: { impact?: number | null };
    reliabilityWeight?: number;
  },
  windowRule: WindowRule,
  timeframe: keyof typeof WINDOW_RULES,
): EventModifier["classification"] {
  const impact = winner.event.impact ?? 1;
  const minutes = winner.minutesToEvent ?? Infinity;
  const rel = winner.relevance.relevance * (winner.reliabilityWeight ?? 1);
  const withinExec = Math.abs(minutes) <= windowRule.execution;
  const withinContext = Math.abs(minutes) <= windowRule.context;

  if (rel >= 0.6 && impact >= 3 && minutes >= 0 && withinExec) {
    return "execution_critical";
  }
  if (rel >= 0.65 && impact >= 2 && withinExec) {
    return "execution_critical";
  }
  if (rel >= 0.4 && withinContext) {
    return "context_relevant";
  }
  if (rel > 0.1) {
    return "awareness_only";
  }
  return "none";
}

function buildRationale(
  classification: EventModifier["classification"],
  winner: {
    minutesToEvent: number | null;
    event: { title?: string | null; impact?: number | null; category?: string | null; scheduledAt?: string | null };
    outsideSession?: boolean;
    relevance: { missingFields: string[] };
  },
  ctx?: Setup["eventContext"] | null,
): string[] {
  const rationale: string[] = [];
  if (classification === "none") return rationale;

  if (classification === "execution_critical") {
    if (typeof winner.minutesToEvent === "number") {
      rationale.push(`High impact in ${winner.minutesToEvent}m`);
    } else if (winner.event.scheduledAt) {
      rationale.push("High impact imminent");
    }
  } else if (classification === "context_relevant" && winner.event.title) {
    rationale.push(`Context: ${shorten(winner.event.title)}`);
  } else if (classification === "awareness_only" && winner.event.title) {
    rationale.push(`Upcoming: ${shorten(winner.event.title)}`);
  }

  if (ctx?.notes?.includes("clustered_events")) {
    rationale.push("Clustered events nearby");
  }
  if (winner.outsideSession) {
    rationale.push("Outside primary session");
  }
  if (winner.relevance.missingFields.length) {
    rationale.push("Limited metadata");
  }
  return rationale.slice(0, 3);
}

function buildAdjustments(
  classification: EventModifier["classification"],
  winner: { proximityWeight?: number; event?: { title?: string | null; category?: string | null } },
  surprise?: EventModifier["surprise"] | null,
): string[] {
  if (classification === "execution_critical") {
    return [
      "delay_entry",
      "reduce_size",
      ...keywordAdjustments(winner.event),
      ...(surprise ? ["post_release_volatility"] : []),
    ];
  }
  if (classification === "context_relevant") {
    const base = [
      "monitor_volatility",
      winner.proximityWeight && winner.proximityWeight < 1 ? "time_buffer" : "standard_risk",
      ...(surprise ? ["post_release_volatility"] : []),
    ];
    return [...base, ...keywordAdjustments(winner.event)];
  }
  if (classification === "awareness_only") {
    return ["monitor_volatility"];
  }
  return [];
}

function keywordAdjustments(
  event?: { title?: string | null; category?: string | null },
): string[] {
  const text = `${event?.title ?? ""} ${event?.category ?? ""}`.toLowerCase();
  if (/rate decision|fomc|ecb|boe|boj|snb|central bank|policy/.test(text)) {
    return ["wait_for_statement"];
  }
  if (/cpi|inflation|pce|deflator/.test(text)) {
    return ["avoid_breakout_pre_release"];
  }
  if (/payroll|employment|nfp|jobless/.test(text)) {
    return ["confirmation_after_release"];
  }
  if (/gdp|growth/.test(text)) {
    return ["size_down"];
  }
  return [];
}

function resolveAssetClass(symbol: string, category?: string | null): AssetClass {
  const lower = symbol.toLowerCase();
  if (lower.includes("usd") || lower.includes("eur") || lower.includes("jpy") || lower.includes("fx") || lower.includes("=x")) {
    return "fx";
  }
  if (lower.startsWith("^") || lower.includes("spx") || lower.includes("dax") || lower.includes("nasdaq")) {
    return "index";
  }
  if (lower.includes("btc") || lower.includes("eth") || lower.includes("crypto") || lower.includes("-usd") || lower.includes("usdt")) {
    return "crypto";
  }
  if (category && category.toLowerCase().includes("commodity")) {
    return "commodity";
  }
  return "other";
}

function isOutsideSession(assetClass: AssetClass, scheduledAt?: string | null, now?: Date): boolean {
  if (!scheduledAt) return false;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return false;
  const berlin = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    timeZone: "Europe/Berlin",
    hour12: false,
  });
  const hour = Number((berlin.formatToParts(date).find((p) => p.type === "hour")?.value ?? "0"));

  if (assetClass === "crypto") return false;
  if (assetClass === "fx") {
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) return true;
    return false;
  }
  // index/commodity simplified sessions (EU 8-22, US 14-22 Berlin)
  if (hour < 8 || hour > 22) return true;
  return false;
}

function computeReliability(
  event: Partial<{ title: string; scheduledAt: string; impact: number; country?: string | null; currency?: string | null; category?: string | null; marketScope?: string | null; summary?: string | null; expectationLabel?: string | null; source?: string | null }>,
  missingFields: string[],
): { weight: number; bucket: "low" | "med" | "high" } {
  let weight = 1;
  if (!event.title || !event.scheduledAt) weight *= 0.6;
  if (event.impact === undefined || event.impact === null) weight *= 0.8;
  const isMacro = (event.category ?? "").toLowerCase() === "macro" || (event.marketScope ?? "").toUpperCase().includes("FX");
  if (isMacro) {
    if (!event.country) weight *= 0.8;
    if (!event.currency) weight *= 0.85;
  }
  if (!event.summary && !event.expectationLabel) {
    weight *= 0.9;
  }
  const sourceWeight = event.source ? SOURCE_WEIGHT[event.source] ?? 0.7 : 0.6;
  weight *= sourceWeight;
  if (missingFields.length >= 2) weight *= 0.8;
  const bucket: "low" | "med" | "high" = weight >= 0.75 ? "high" : weight >= 0.5 ? "med" : "low";
  return { weight: clamp01(weight), bucket };
}

function computeSurprise(
  winner: {
    minutesToEvent: number | null;
    event: { actualValue?: string | number | null; forecastValue?: string | number | null };
  },
  now: Date,
  postWindowMinutes: number,
): { label: "above" | "below" | "inline"; magnitude?: number } | null {
  if (winner.minutesToEvent === null || winner.minutesToEvent > 0 || Math.abs(winner.minutesToEvent) > postWindowMinutes) {
    return null;
  }
  const actual = parseNumeric(winner.event.actualValue);
  const forecast = parseNumeric(winner.event.forecastValue);
  if (actual === null || forecast === null) return null;
  const diff = actual - forecast;
  const magnitude = forecast !== 0 ? Math.abs(diff / forecast) : Math.abs(diff);
  if (Math.abs(diff) < 1e-6) {
    return { label: "inline", magnitude };
  }
  return { label: diff > 0 ? "above" : "below", magnitude };
}

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed / (trimmed.includes("%") ? 100 : 1) : null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
