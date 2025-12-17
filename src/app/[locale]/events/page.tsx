import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import clsx from "clsx";
import { getEventsInRange, type Event as DbEvent } from "@/src/server/repositories/eventRepository";
import { buildDedupKey, normalizeTitle, roundScheduledAt } from "@/src/server/events/ingest/ingestJbNewsCalendar";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

export const revalidate = 900;

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type Translator = (key: string) => string;

type BadgeTone = "muted" | "warn" | "danger";

type UiEvent = {
  id: string;
  title: string;
  description: string;
  categoryKey: string;
  severityKey: string;
  severityTone: BadgeTone;
  formattedTime: string;
  source: string;
  symbols: string[];
  country?: string | null;
  currency?: string | null;
};

type EventGroup = {
  isoDate: string;
  heading: string;
  events: UiEvent[];
  highImpactCount: number;
};

type NextUpEvent = {
  id: string;
  title: string;
  formattedTime: string;
  categoryKey: string;
  impactKey: string;
  impactTone: BadgeTone;
  countdown: string;
};

type CategoryFilter = "all" | "macro" | "crypto" | "onchain" | "technical" | "other";
type ImpactFilter = "all" | "1" | "2" | "3";

type FilterParams = {
  category: CategoryFilter;
  impact: ImpactFilter;
};

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; labelKey: string }> = [
  { value: "all", labelKey: "events.filters.all" },
  { value: "macro", labelKey: "events.category.macro" },
  { value: "crypto", labelKey: "events.category.crypto" },
  { value: "onchain", labelKey: "events.category.onchain" },
  { value: "technical", labelKey: "events.category.technical" },
  { value: "other", labelKey: "events.category.other" },
];

const IMPACT_OPTIONS: Array<{ value: ImpactFilter; labelKey: string }> = [
  { value: "all", labelKey: "events.filters.all" },
  { value: "3", labelKey: "events.severity.high" },
  { value: "2", labelKey: "events.severity.medium" },
  { value: "1", labelKey: "events.severity.low" },
];

export default async function EventsPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const t = getTranslator(locale);
  const resolvedSearch = searchParams ? await searchParams : {};
  const filters = parseFilterParams(resolvedSearch ?? {});

  const { from, to } = resolveWeekRange();
  const rows = await getEventsInRange(
    { from, to },
    {
      category: filters.category === "all" ? undefined : filters.category,
      impact: filters.impact === "all" ? undefined : Number(filters.impact),
    },
  );
  const deduped = dedupeRows(rows);
  const sorted = deduped.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const nextUpEvents = buildNextUpEvents(sorted, locale, t);
  const grouped = groupByDay(sorted, locale, t);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("events.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("events.subtitle")}</p>
        </header>

        <NextUpSection events={nextUpEvents} t={t} />

        <FilterPanel locale={locale} filters={filters} t={t} />

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
            {t("events.empty")}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.isoDate} className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{group.heading}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">
                    <span>
                      {group.events.length} {t("events.countLabel")}
                    </span>
                    {group.highImpactCount > 0 ? (
                      <span className="rounded-full border border-rose-500/60 bg-rose-500/10 px-2 py-0.5 text-[0.65rem] lowercase tracking-tight text-rose-200">
                        {t("events.highImpactBadge").replace("{count}", group.highImpactCount.toString())}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {group.events.map((event) => (
                    <article
                      key={event.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[0_12px_35px_rgba(2,6,23,0.25)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">{event.formattedTime}</p>
                          <h3 className="text-base font-semibold text-white">{event.title}</h3>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <Badge tone="muted">{t(event.categoryKey)}</Badge>
                          <Badge tone={event.severityTone}>{t(event.severityKey)}</Badge>
                        </div>
                      </div>
                      {event.description ? (
                        <p className="text-sm leading-snug text-[var(--text-secondary)]">{event.description}</p>
                      ) : null}
                      <ul className="text-xs text-[var(--text-secondary)]">
                        <li>
                          {t("events.symbols.label")}: {event.symbols.length ? event.symbols.join(", ") : "Global"}
                        </li>
                        {event.country ? (
                          <li>
                            {t("events.countryLabel")}: {event.country}
                          </li>
                        ) : null}
                        {event.currency ? (
                          <li>
                            {t("events.currencyLabel")}: {event.currency}
                          </li>
                        ) : null}
                        <li className="mt-1">
                          {t("events.sourceLabel")}: {event.source}
                        </li>
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTranslator(locale: Locale): Translator {
  const messages = locale === "de" ? (deMessages as Record<string, string>) : (enMessages as Record<string, string>);
  return (key: string): string => messages[key] ?? key;
}

function resolveWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(startUtc.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from: startUtc, to };
}

function dedupeRows(rows: DbEvent[]): DbEvent[] {
  const map = new Map<string, DbEvent>();
  for (const row of rows) {
    const normalizedTitle = normalizeTitle(row.title);
    const roundedDate = roundScheduledAt(row.scheduledAt);
    const dedupKey = buildDedupKey({
      source: row.source ?? "unknown",
      normalizedTitle,
      roundedDate,
      country: row.country ?? undefined,
    });
    const existing = map.get(dedupKey);
    if (!existing) {
      map.set(dedupKey, row);
      continue;
    }
    const currentScore = computeRichnessScore(row);
    const existingScore = computeRichnessScore(existing);
    if (currentScore > existingScore) {
      map.set(dedupKey, row);
      continue;
    }
    if (currentScore === existingScore && row.updatedAt && existing.updatedAt) {
      if (row.updatedAt > existing.updatedAt) {
        map.set(dedupKey, row);
      }
      continue;
    }
    if (currentScore === existingScore && row.scheduledAt > existing.scheduledAt) {
      map.set(dedupKey, row);
    }
  }
  return Array.from(map.values());
}

function computeRichnessScore(event: DbEvent): number {
  let score = 0;
  if (event.description) score += 1;
  if (event.actualValue) score += 2;
  if (event.forecastValue) score += 1;
  if (event.previousValue) score += 1;
  return score;
}

function groupByDay(events: DbEvent[], locale: Locale, t: Translator): EventGroup[] {
  if (events.length === 0) {
    return [];
  }
  const intlLocale = toIntlLocale(locale);
  const dayFormatter = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    month: locale === "de" ? "long" : "short",
    day: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  const groups = new Map<string, EventGroup>();

  for (const event of events) {
    const isoDate = event.scheduledAt.toISOString().slice(0, 10);
    const existing = groups.get(isoDate);
    const group = existing ?? { isoDate, heading: dayFormatter.format(event.scheduledAt), events: [], highImpactCount: 0 };
    const severity = mapSeverity(event.impact);
    const severityKey = `events.severity.${severity}`;
    const category = mapCategory(event.category);
    const categoryKey = `events.category.${category}`;
    if (severity === "high") {
      group.highImpactCount += 1;
    }
    const currency = (event as DbEvent & { currency?: string | null }).currency ?? null;
    group.events.push({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      categoryKey,
      severityKey,
      severityTone: severity === "high" ? "danger" : severity === "medium" ? "warn" : "muted",
      formattedTime: `${t("events.time.start")}: ${timeFormatter.format(event.scheduledAt)}`,
      source: event.source,
      symbols: Array.isArray(event.affectedAssets) ? event.affectedAssets.map(String) : [],
      country: event.country ?? null,
      currency,
    });
    groups.set(isoDate, group);
  }

  return Array.from(groups.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

function buildNextUpEvents(events: DbEvent[], locale: Locale, t: Translator): NextUpEvent[] {
  const now = Date.now();
  const intlLocale = toIntlLocale(locale);
  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const upcoming = events
    .filter((event) => event.scheduledAt.getTime() >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 3);
  return upcoming.map((event) => {
    const severity = mapSeverity(event.impact);
    const category = mapCategory(event.category);
    return {
      id: event.id,
      title: event.title,
      formattedTime: timeFormatter.format(event.scheduledAt),
      categoryKey: `events.category.${category}`,
      impactKey: `events.severity.${severity}`,
      impactTone: severity === "high" ? "danger" : severity === "medium" ? "warn" : "muted",
      countdown: formatCountdown(event.scheduledAt, t),
    };
  });
}

function formatCountdown(target: Date, t: Translator): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 60000) {
    return t("events.nextUp.countdownNow");
  }
  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  if (parts.length === 0) {
    return t("events.nextUp.countdownLessThanMinute");
  }
  return t("events.nextUp.countdown").replace("{time}", parts.join(" "));
}

function mapSeverity(impact: number): "low" | "medium" | "high" {
  if (impact >= 3) return "high";
  if (impact === 2) return "medium";
  return "low";
}

function mapCategory(value: string): "macro" | "crypto" | "onchain" | "technical" | "other" {
  const allowed = new Set(["macro", "crypto", "onchain", "technical", "other"]);
  return allowed.has(value) ? (value as any) : "other";
}

function toIntlLocale(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-US";
}

type BadgeProps = {
  children: string;
  tone?: BadgeTone;
  className?: string;
};

function Badge({ children, tone = "muted", className }: BadgeProps): JSX.Element {
  const styles =
    tone === "danger"
      ? "bg-red-500/15 text-red-300 border-red-500/40"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
        : "bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-subtle)]";
  return (
    <span className={clsx("rounded-full border px-2 py-0.5 font-semibold", styles, className)}>
      {children}
    </span>
  );
}

type FilterPanelProps = {
  locale: Locale;
  filters: FilterParams;
  t: Translator;
};

function FilterPanel({ locale, filters, t }: FilterPanelProps): JSX.Element {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">{t("events.filters.categoryLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              href={buildFilterHref(locale, filters, { category: option.value })}
              active={filters.category === option.value}
            >
              {t(option.labelKey)}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">{t("events.filters.impactLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {IMPACT_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              href={buildFilterHref(locale, filters, { impact: option.value })}
              active={filters.impact === option.value}
            >
              {t(option.labelKey)}
            </FilterChip>
          ))}
        </div>
      </div>
    </div>
  );
}

type FilterChipProps = {
  href: string;
  children: string;
  active: boolean;
};

function FilterChip({ href, children, active }: FilterChipProps): JSX.Element {
  return (
    <Link
      prefetch={false}
      href={href}
      className={clsx(
        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
        active
          ? "border-sky-400 bg-sky-500/20 text-sky-100"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-sky-500/60 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

type NextUpSectionProps = {
  events: NextUpEvent[];
  t: Translator;
};

function NextUpSection({ events, t }: NextUpSectionProps): JSX.Element {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white sm:text-xl">{t("events.nextUp.title")}</h2>
        {events.length > 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">
            {t("events.nextUp.countLabel").replace("{count}", events.length.toString())}
          </p>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("events.nextUp.empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.id}
              className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/40 p-3 shadow-[0_10px_30px_rgba(2,6,23,0.25)]"
            >
              <p className="text-sm font-semibold text-white">{event.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Badge tone="muted">{t(event.categoryKey)}</Badge>
                <Badge tone={event.impactTone}>{t(event.impactKey)}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{event.formattedTime}</span>
                <span className="text-sky-300">{event.countdown}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function parseFilterParams(raw: Record<string, string | string[] | undefined>): FilterParams {
  const categoryRaw = getParamValue(raw.category);
  const impactRaw = getParamValue(raw.impact);
  const category: CategoryFilter = isCategoryFilter(categoryRaw) ? categoryRaw : "all";
  const impact: ImpactFilter = isImpactFilter(impactRaw) ? impactRaw : "all";
  return { category, impact };
}

function getParamValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function isCategoryFilter(value?: string): value is CategoryFilter {
  if (!value) return false;
  return (["all", "macro", "crypto", "onchain", "technical", "other"] as const).includes(value as CategoryFilter);
}

function isImpactFilter(value?: string): value is ImpactFilter {
  if (!value) return false;
  return (["all", "1", "2", "3"] as const).includes(value as ImpactFilter);
}

function buildFilterHref(locale: Locale, filters: FilterParams, overrides: Partial<FilterParams>): string {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.category !== "all") params.set("category", next.category);
  if (next.impact !== "all") params.set("impact", next.impact);
  const query = params.toString();
  return query ? `/${locale}/events?${query}` : `/${locale}/events`;
}
