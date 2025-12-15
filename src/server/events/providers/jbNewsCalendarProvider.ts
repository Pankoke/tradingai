import { createHash } from "node:crypto";

type ImpactLevel = 1 | 2 | 3;

type UnknownRecord = Record<string, unknown>;

export type JbNewsCalendarEvent = {
  source: "jb-news";
  sourceId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  impact?: ImpactLevel;
  currency?: string;
  country?: string;
  actual?: string | number;
  forecast?: string | number;
  previous?: string | number;
};

type JbNewsCalendarApiEvent = {
  id?: string;
  title: string;
  description?: string;
  datetime: string;
  impact?: string | number | null;
  currency?: string | null;
  country?: string | null;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
};

type JbNewsCalendarApiResponse = {
  events: JbNewsCalendarApiEvent[];
};

export type JbNewsCalendarProviderConfig = {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
};

const DEFAULT_ENDPOINT = "https://api.jb-news.com/v1/calendar";
const DEFAULT_TIMEOUT_MS = 15_000;

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
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(config: JbNewsCalendarProviderConfig = {}) {
    const key = config.apiKey ?? process.env.JB_NEWS_API_KEY;
    if (!key) {
      throw new JbNewsConfigError("JB_NEWS_API_KEY is not configured");
    }
    this.apiKey = key;
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async fetchCalendar(params: { from: Date; to: Date }): Promise<ReadonlyArray<JbNewsCalendarEvent>> {
    const url = new URL(this.endpoint);
    url.searchParams.set("from", params.from.toISOString());
    url.searchParams.set("to", params.to.toISOString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const message =
          response.status === 429
            ? "jb-news calendar rate limit reached (429)"
            : `jb-news calendar request failed (${response.status})`;
        throw new JbNewsApiError(message, response.status);
      }

      const raw = (await response.json()) as unknown;
      const parsed = parseJbNewsCalendarResponse(raw);
      return parsed.events.map(normalizeEvent);
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
}

function parseJbNewsCalendarResponse(payload: unknown): JbNewsCalendarApiResponse {
  if (!isRecord(payload)) {
    throw new Error("jb-news response is not an object");
  }
  const { events } = payload;
  if (!Array.isArray(events)) {
    throw new Error("jb-news response missing events array");
  }
  const parsedEvents: JbNewsCalendarApiEvent[] = events
    .map((event) => parseJbNewsCalendarEvent(event))
    .filter((event): event is JbNewsCalendarApiEvent => event !== null);

  return { events: parsedEvents };
}

function parseJbNewsCalendarEvent(value: unknown): JbNewsCalendarApiEvent | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const datetime =
    typeof value.datetime === "string"
      ? value.datetime
      : typeof value.time === "string"
        ? value.time
        : typeof value.scheduledAt === "string"
          ? value.scheduledAt
          : "";

  if (!title || !datetime) {
    return null;
  }

  const data: JbNewsCalendarApiEvent = {
    id: typeof value.id === "string" ? value.id : undefined,
    title,
    description: typeof value.description === "string" ? value.description : undefined,
    datetime,
    impact: typeof value.impact === "number" || typeof value.impact === "string" ? value.impact : undefined,
    currency: typeof value.currency === "string" ? value.currency : undefined,
    country: typeof value.country === "string" ? value.country : undefined,
    actual: parseValueField(value.actual),
    forecast: parseValueField(value.forecast),
    previous: parseValueField(value.previous),
  };

  return data;
}

function normalizeEvent(raw: JbNewsCalendarApiEvent): JbNewsCalendarEvent {
  const scheduledAt = new Date(raw.datetime);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error(`Invalid jb-news datetime value: ${raw.datetime}`);
  }

  return {
    source: "jb-news",
    sourceId: computeSourceId(raw),
    title: raw.title,
    description: raw.description,
    scheduledAt,
    impact: mapImpact(raw.impact),
    currency: raw.currency ?? undefined,
    country: raw.country ?? undefined,
    actual: raw.actual ?? undefined,
    forecast: raw.forecast ?? undefined,
    previous: raw.previous ?? undefined,
  };
}

function computeSourceId(raw: JbNewsCalendarApiEvent): string {
  if (raw.id && raw.id.trim()) {
    return `jb-news:${raw.id.trim()}`;
  }
  const hash = createHash("sha1")
    .update(`${raw.title}|${raw.datetime}|${raw.currency ?? ""}`)
    .digest("hex");
  return `jb-news:${hash}`;
}

function mapImpact(value?: string | number | null): ImpactLevel | undefined {
  if (typeof value === "number") {
    const rounded = Math.round(value);
    if (rounded >= 1 && rounded <= 3) {
      return rounded as ImpactLevel;
    }
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "high") return 3;
    if (normalized === "medium") return 2;
    if (normalized === "low") return 1;
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3) {
      return parsed as ImpactLevel;
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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}
