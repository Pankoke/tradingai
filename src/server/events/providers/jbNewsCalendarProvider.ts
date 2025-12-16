import { createHash } from "node:crypto";
import { logger } from "@/src/lib/logger";

export type JbNewsCalendarEvent = {
  source: "jb-news";
  sourceId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  impact?: 1 | 2 | 3;
  currency?: string;
  country?: string;
  actual?: string | number;
  forecast?: string | number;
  previous?: string | number;
};

export type JbNewsCalendarProviderConfig = {
  apiKey?: string;
  timeoutMs?: number;
};

const BASE_URL = "https://www.jblanked.com";
const WEEK_ENDPOINT = { key: "mql5", path: "/news/api/mql5/calendar/week/" } as const;

type SourceKey = (typeof WEEK_ENDPOINT)["key"];
type SourceEndpoint = typeof WEEK_ENDPOINT;

export class JbNewsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JbNewsConfigError";
  }
}

export class JbNewsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "JbNewsApiError";
    this.status = status;
  }
}

export class JbNewsCalendarProvider {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly log = logger.child({ module: "jb-news-calendar-provider" });

  constructor(config: JbNewsCalendarProviderConfig = {}) {
    const key = config.apiKey ?? process.env.JB_NEWS_API_KEY;
    if (!key) {
      throw new JbNewsConfigError("JB_NEWS_API_KEY is not configured");
    }
    this.apiKey = key;
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  async fetchCalendar(params: { from: Date; to: Date }): Promise<ReadonlyArray<JbNewsCalendarEvent>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const aggregated = await this.fetchWeekMql5(params, controller.signal);
      const deduped = dedupeEvents(aggregated);
      this.log.info("jb-news calendar fetch summary", {
        mode: "week",
        source: "mql5",
        totalEvents: deduped.length,
      });
      if (!deduped.length) {
        throw new Error("jb-news calendar: no authorized or available sources");
      }
      return deduped;
    } catch (error) {
      if (error instanceof JbNewsApiError || error instanceof JbNewsConfigError) {
        throw error;
      }
      if ((error as { name?: string }).name === "AbortError") {
        throw new Error("jb-news calendar request timed out");
      }
      throw new Error(`jb-news calendar request failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders() {
    return {
      Authorization: `Api-Key ${this.apiKey}`,
      "x-api-key": this.apiKey,
      Accept: "application/json",
    };
  }

  private async fetchWeekMql5(params: { from: Date; to: Date }, signal: AbortSignal): Promise<JbNewsCalendarEvent[]> {
    const url = new URL(`${BASE_URL}${WEEK_ENDPOINT.path}`);
    url.searchParams.set("from", formatDateParam(params.from));
    url.searchParams.set("to", formatDateParam(params.to));

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const message =
        response.status === 429
          ? `jb-news mql5 rate limit reached (429)`
          : `jb-news mql5 request failed (${response.status})`;
      throw new JbNewsApiError(message, response.status);
    }

    const raw = (await response.json()) as unknown;
    const parsed = parseJbNewsResponse(raw);
    return parsed
      .map((entry) => normalizeSourceEvent(entry, WEEK_ENDPOINT.key))
      .filter((event): event is JbNewsCalendarEvent => event !== null);
  }
}

type RawEvent = Record<string, unknown>;

function parseJbNewsResponse(payload: unknown): RawEvent[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!isRecord(payload)) {
    throw new Error("jb-news response is not an object");
  }
  if (Array.isArray(payload.events)) {
    return payload.events.filter(isRecord);
  }
  if (Array.isArray(payload.data)) {
    return payload.data.filter(isRecord);
  }
  throw new Error("jb-news response missing events array");
}

function normalizeSourceEvent(raw: RawEvent, sourceKey: SourceKey): JbNewsCalendarEvent | null {
  const title =
    extractStringField(raw, ["Name", "Title", "Event", "EventName", "Headline"])?.trim() ?? "";
  if (!title) {
    return null;
  }

  const datetime = extractStringField(raw, ["Date", "Datetime", "scheduledAt", "Time", "DateTime", "date"]);
  if (!datetime) {
    return null;
  }
  let scheduledAt: Date;
  try {
    scheduledAt = parseScheduledAt(datetime);
  } catch {
    return null;
  }

  const impact = mapImpactField(
    extractStringField(raw, ["Impact", "Importance", "Level", "Weight"]),
  );
  const description = extractStringField(raw, ["Description", "Desc", "Body"]);
  const currency = extractStringField(raw, ["Currency", "Curr", "Ccy"]);
  const country = extractStringField(raw, ["Country", "Region", "Market"]);
  const actual = parseValueField(raw.Actual ?? raw.Value ?? raw["ActualValue"]);
  const forecast = parseValueField(raw.Forecast ?? raw["ForecastValue"]);
  const previous = parseValueField(raw.Previous ?? raw["PreviousValue"]);

  const sourceId = deriveSourceId(raw, title, scheduledAt, currency);

  return {
    source: "jb-news",
    sourceId,
    title,
    description: description ?? undefined,
    scheduledAt,
    impact,
    currency: currency ?? undefined,
    country: country ?? undefined,
    actual,
    forecast,
    previous,
  };
}

function deriveSourceId(raw: RawEvent, title: string, scheduledAt: Date, currency?: string): string {
  const explicitId = extractStringField(raw, ["Id", "EventId", "Uid"]);
  if (explicitId) {
    return `jb-news:${explicitId}`;
  }
  const components = [title, scheduledAt.toISOString(), currency ?? ""].join("|");
  const hash = createHash("sha1").update(components).digest("hex");
  return `jb-news:${hash}`;
}

function dedupeEvents(events: JbNewsCalendarEvent[]): JbNewsCalendarEvent[] {
  const map = new Map<string, JbNewsCalendarEvent>();
  for (const event of events) {
    const key = dedupKey(event);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, event);
      continue;
    }
    if (computeRichness(event) > computeRichness(existing)) {
      map.set(key, event);
    }
  }
  return Array.from(map.values());
}

function dedupKey(event: JbNewsCalendarEvent): string {
  return `${event.title}|${event.currency ?? ""}|${event.scheduledAt.toISOString()}`;
}

function computeRichness(event: JbNewsCalendarEvent): number {
  let score = 0;
  if (event.actual) score += 3;
  if (event.forecast) score += 2;
  if (event.previous) score += 2;
  if (event.description) score += 1;
  if (event.impact !== undefined) score += 1;
  return score;
}

function parseScheduledAt(value: string): Date {
  const cleaned = value.trim();
  const replaced = cleaned.replace(/\./g, "-").replace(" ", "T");
  const isoCandidate = replaced.endsWith("Z") ? replaced : `${replaced}Z`;
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid jb-news datetime value: ${value}`);
  }
  return parsed;
}

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

function mapImpactField(value?: string | number): 1 | 2 | 3 | undefined {
  if (typeof value === "number") {
    const rounded = Math.round(value);
    if (rounded >= 1 && rounded <= 3) {
      return rounded as 1 | 2 | 3;
    }
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "high") return 3;
    if (normalized === "medium") return 2;
    if (normalized === "low") return 1;
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3) {
      return parsed as 1 | 2 | 3;
    }
  }
  return undefined;
}

function extractStringField(raw: RawEvent, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function parseValueField(value: unknown): string | number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? trimmed : numeric;
  }
  return undefined;
}

function isRecord(value: unknown): value is RawEvent {
  return typeof value === "object" && value !== null;
}
