import type { EventModifier } from "@/src/lib/engine/types";
import type { Setup } from "@/src/lib/engine/types";
import { computeEventRelevance } from "@/src/lib/engine/modules/eventRelevance";

type BuildParams = {
  context?: Setup["eventContext"] | null;
  setup?: Pick<Setup, "symbol" | "timeframe" | "category">;
  now?: Date;
};

const IMPACT_WEIGHT: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1 };

type WindowRule = { execution: number; context: number };
const WINDOW_RULES: Record<"intraday" | "daily" | "swing" | "unknown", WindowRule> = {
  intraday: { execution: 60, context: 360 },
  daily: { execution: 120, context: 720 },
  swing: { execution: 240, context: 1440 },
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
      const reliabilityWeight = relevance.missingFields.length >= 2 ? 0.7 : 1;
      const sessionPenalty = isOutsideSession(assetProfile.assetClass, event.scheduledAt, now) ? 0.6 : 1;
      const priority = relevance.relevance * impactWeight * proximityWeight * reliabilityWeight * sessionPenalty;
      const outsideSession = sessionPenalty < 1;
      return { event, minutesToEvent, relevance, priority, outsideSession, proximityWeight };
    })
    .sort((a, b) => b.priority - a.priority);

  const winner = ranked[0];
  if (!winner) {
    return { classification: "none", primaryEvent: undefined, quality: { usedGlobalFallback: false } };
  }

  const classification = classifyModifier(winner, windowRule, timeframeKind);

  const rationale = buildRationale(classification, winner, ctx);
  const executionAdjustments = buildAdjustments(classification, winner);

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
    quality: {
      usedGlobalFallback: ctx?.notes?.some((n) => n === "hash_fallback" || n === "events_db_unavailable") ?? false,
      missingFields: winner.relevance.missingFields.length ? winner.relevance.missingFields : undefined,
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
  if (absMins <= windowRule.context) return timeframe === "intraday" ? 0.7 : 0.6;
  return 0.35;
}

function classifyModifier(
  winner: {
    minutesToEvent: number | null;
    relevance: { relevance: number };
    event: { impact?: number | null };
  },
  windowRule: WindowRule,
  timeframe: keyof typeof WINDOW_RULES,
): EventModifier["classification"] {
  const impact = winner.event.impact ?? 1;
  const minutes = winner.minutesToEvent ?? Infinity;
  const rel = winner.relevance.relevance;
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
  winner: { proximityWeight?: number },
): string[] {
  if (classification === "execution_critical") {
    return ["delay_entry", "reduce_size"];
  }
  if (classification === "context_relevant") {
    return ["monitor_volatility", winner.proximityWeight && winner.proximityWeight < 1 ? "time_buffer" : "standard_risk"];
  }
  if (classification === "awareness_only") {
    return ["monitor_volatility"];
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
