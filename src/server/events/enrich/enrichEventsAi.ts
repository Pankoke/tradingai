"use server";

import { z } from "zod";
import { logger } from "@/src/lib/logger";
import {
  listEventsForEnrichment,
  updateEventEnrichment,
  type Event,
} from "@/src/server/repositories/eventRepository";
import {
  MARKET_SCOPE_ENUM,
  type MarketScopeEnum,
} from "@/src/server/events/eventDescription";

type EnrichOptions = {
  limit?: number;
  daysAhead?: number;
};

export type EnrichEventsResult = {
  enriched: number;
  skipped: number;
  failed: number;
  totalCandidates: number;
  limitUsed: number;
  windowFrom: Date | null;
  windowTo: Date | null;
  totalRetries: number;
};

const enrichmentLogger = logger.child({ module: "events-ai-enrichment" });
const DEFAULT_LIMIT = Number.parseInt(process.env.EVENTS_AI_ENRICH_LIMIT ?? "15", 10);
const MAX_LIMIT = 50;
const DEFAULT_WINDOW_DAYS = 14;
const MAX_WINDOW_DAYS = 30;
const MODEL = process.env.EVENTS_AI_ENRICH_MODEL ?? "gpt-4o-mini";
const parsedTimeout = Number.parseInt(process.env.EVENTS_AI_TIMEOUT_MS ?? "", 10);
const DEFAULT_TIMEOUT_MS = Number.isFinite(parsedTimeout) ? parsedTimeout : 12_000;
const parsedRetries = Number.parseInt(process.env.EVENTS_AI_MAX_RETRIES ?? "", 10);
const MAX_RETRIES = Number.isFinite(parsedRetries) ? Math.max(0, parsedRetries) : 2;
const ALLOW_EXPECTATION_DETAILS = process.env.EVENTS_AI_ALLOW_EXPECTATION === "1";
const STANDARD_EXPECTATION_NOTE =
  "Informational-only, consensus-style context; not a prediction or trading advice.";
const SUMMARY_MAX_LENGTH = 240;

const MARKET_SCOPE_VALUES = Object.values(MARKET_SCOPE_ENUM);

const ENRICHMENT_SCHEMA = z.object({
  summary: z.string().min(12).max(240),
  marketScope: z.nativeEnum(MARKET_SCOPE_ENUM),
  expectationLabel: z.enum(["above", "inline", "below", "unknown"]),
  expectationConfidence: z.number().int().min(0).max(100),
  expectationNote: z.string().max(160).optional().default(""),
});

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "event_enrichment",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string", minLength: 12, maxLength: SUMMARY_MAX_LENGTH },
        marketScope: { type: "string", enum: MARKET_SCOPE_VALUES },
        expectationLabel: { type: "string", enum: ["above", "inline", "below", "unknown"] },
        expectationConfidence: {
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
        expectationNote: { type: "string" },
      },
      required: ["summary", "marketScope", "expectationLabel", "expectationConfidence", "expectationNote"],
    },
  },
};

type RetryStats = {
  totalRetries: number;
};

export async function enrichEventsAi(options?: EnrichOptions): Promise<EnrichEventsResult> {
  if (process.env.EVENTS_AI_ENRICH_ENABLED !== "1") {
    enrichmentLogger.warn("AI enrichment disabled via config");
    return {
      enriched: 0,
      skipped: 0,
      failed: 0,
      totalCandidates: 0,
      limitUsed: 0,
      windowFrom: null,
      windowTo: null,
      totalRetries: 0,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    enrichmentLogger.warn("OPENAI_API_KEY missing; skipping enrichment");
    return {
      enriched: 0,
      skipped: 0,
      failed: 0,
      totalCandidates: 0,
      limitUsed: 0,
      windowFrom: null,
      windowTo: null,
      totalRetries: 0,
    };
  }

  const limit = clampNumber(options?.limit ?? DEFAULT_LIMIT, 1, Math.min(MAX_LIMIT, DEFAULT_LIMIT));
  const windowDays = clampNumber(options?.daysAhead ?? DEFAULT_WINDOW_DAYS, 1, MAX_WINDOW_DAYS);
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const candidates = await listEventsForEnrichment({ from, to, limit });

  const retryStats: RetryStats = { totalRetries: 0 };

  if (!candidates.length) {
    enrichmentLogger.info("No events pending for AI enrichment", { limit, windowDays });
    return {
      enriched: 0,
      skipped: 0,
      failed: 0,
      totalCandidates: 0,
      limitUsed: limit,
      windowFrom: from,
      windowTo: to,
      totalRetries: 0,
    };
  }

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of candidates) {
    try {
      const payload = await generateEnrichment(event, apiKey, retryStats);
      await updateEventEnrichment(event.id, {
        ...payload,
        enrichedAt: new Date(),
      });
      enriched += 1;
    } catch (error) {
      failed += 1;
      enrichmentLogger.error("Failed to enrich event", {
        eventId: event.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    enriched,
    skipped,
    failed,
    totalCandidates: candidates.length,
    limitUsed: limit,
    windowFrom: from,
    windowTo: to,
    totalRetries: retryStats.totalRetries,
  };
}

async function generateEnrichment(event: Event, apiKey: string, stats: RetryStats) {
  const completion = await callWithRetry(async () => requestCompletion(event, apiKey), stats);
  const parsed = ENRICHMENT_SCHEMA.parse(completion);
  const summary = sanitizeSummary(parsed.summary);
  const scope = parsed.marketScope as MarketScopeEnum;
  const expectation = normalizeExpectations(parsed);
  return {
    summary,
    marketScope: scope,
    expectationLabel: expectation.label,
    expectationConfidence: expectation.confidence,
    expectationNote: expectation.note,
  };
}

function buildPrompt(event: Event): string {
  const lines = [
    `Title: ${event.title}`,
    `Category: ${event.category}`,
    `Impact: ${event.impact}`,
    `ScheduledAt: ${event.scheduledAt.toISOString()}`,
  ];
  if (event.country) {
    lines.push(`Country: ${event.country}`);
  }
  const currency = (event as Event & { currency?: string | null }).currency ?? null;
  if (currency) {
    lines.push(`Currency: ${currency}`);
  }
  if (event.actualValue) {
    lines.push(`Actual: ${event.actualValue}`);
  }
  if (event.forecastValue) {
    lines.push(`Forecast: ${event.forecastValue}`);
  }
  if (event.previousValue) {
    lines.push(`Previous: ${event.previousValue}`);
  }

  return `
You will enrich an economic calendar event for an internal knowledge base.
Use only the provided metadata. Summaries must be informational, consensus-style, and highlight why the event matters for traders.
Instruction set:
- summary: 1-2 sentences (<=${SUMMARY_MAX_LENGTH} chars) explaining what the event measures and potential market impact. English only.
- marketScope: choose EXACTLY one enum token from ${MARKET_SCOPE_VALUES.join(", ")} (e.g. FX_RATES_INDICES = FX, rates, index futures; CRYPTO = crypto assets; COMMODITIES = commodities; EQUITIES_INDICES = equities; GLOBAL = broad impact; UNKNOWN = unsure).
- expectationLabel: choose "above", "inline", "below", or "unknown". If unclear, return "unknown".
- expectationConfidence: integer 0-100 only if label != "unknown". Otherwise null.
- expectationNote: optional short phrase (<=160 chars) reinforcing that this is informational/consensus-style, not advice.
- Never provide trading instructions, positions, or forecasts beyond generic statements.
- Output ONLY valid JSON with keys: summary, marketScope, expectationLabel, expectationConfidence, expectationNote.
- Do not wrap JSON in code fences.

Event details:
${lines.map((line) => `- ${line}`).join("\n")}
`.trim();
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("openai_invalid_json");
  }
  const json = raw.slice(start, end + 1);
  return JSON.parse(json);
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

async function callWithRetry<T>(fn: () => Promise<T>, stats: RetryStats): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || attempt >= MAX_RETRIES) {
        throw error;
      }
      attempt += 1;
      stats.totalRetries += 1;
      await delay(getBackoffDuration(attempt));
    }
  }
}

async function requestCompletion(event: Event, apiKey: string): Promise<unknown> {
  const prompt = buildPrompt(event);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 350,
        response_format: RESPONSE_FORMAT,
        messages: [
          {
            role: "system",
            content:
              "You are an analyst summarizing economic calendar events. Respond in concise English. " +
              "Output valid JSON that matches the provided schema. Do not provide trading advice.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw createError(`openai_http_${response.status}`, { retryable, detail: body.slice(0, 200) });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      throw createError("openai_empty_response");
    }
    return extractJson(raw);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createError("openai_timeout", { retryable: true });
    }
    if (isNetworkError(error)) {
      throw createError("openai_network_error", { retryable: true });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeSummary(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    throw new Error("summary_empty");
  }
  if (trimmed.length <= SUMMARY_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, SUMMARY_MAX_LENGTH - 1).trim()}…`;
}

function normalizeExpectations(parsed: z.infer<typeof ENRICHMENT_SCHEMA>) {
  if (!ALLOW_EXPECTATION_DETAILS) {
    return { label: "unknown" as const, confidence: 0, note: STANDARD_EXPECTATION_NOTE };
  }
  const label = parsed.expectationLabel;
  if (label === "unknown") {
    return { label, confidence: 0, note: STANDARD_EXPECTATION_NOTE };
  }
  const confidence = clampNumber(parsed.expectationConfidence, 0, 100);
  return {
    label,
    confidence,
    note: composeExpectationNote(parsed.expectationNote),
  };
}

function composeExpectationNote(candidate?: string): string {
  if (!candidate) {
    return STANDARD_EXPECTATION_NOTE;
  }
  const sanitized = candidate.replace(/[^\w\s.,;:()-]/g, "").trim();
  if (!sanitized) {
    return STANDARD_EXPECTATION_NOTE;
  }
  const combined = `${STANDARD_EXPECTATION_NOTE} ${sanitized}`;
  return combined.length > 160 ? combined.slice(0, 160) : combined;
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("fetch") || message.includes("network") || message.includes("socket");
}

function createError(message: string, options?: { retryable?: boolean; detail?: string }) {
  const error = new Error(options?.detail ? `${message}: ${options.detail}` : message);
  if (options?.retryable) {
    (error as Error & { retryable?: boolean }).retryable = true;
  }
  return error;
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return Boolean((error as { retryable?: boolean }).retryable);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDuration(attempt: number): number {
  const base = 300 * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.random() * 250;
  return Math.min(2000, base + jitter);
}
