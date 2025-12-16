"use client";

import { useMemo, useEffect, useActionState } from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n";
import {
  triggerEventsIngestionAction,
  type EventsIngestionFormState,
} from "@/src/app/[locale]/admin/(panel)/ops/eventsIngestionAction";

type EventsIngestionMessages = {
  title: string;
  description: string;
  button: string;
  selectLabel: string;
  selectOptions: Record<string, string>;
  lastRunLabel: string;
  noRuns: string;
  statusSuccess: string;
  statusFailed: string;
  countsLabel: string;
  windowLabel: string;
  runAtLabel: string;
  errorLabel: string;
  resultLabel: string;
};

type LastRunMeta = {
  imported?: number;
  updated?: number;
  skipped?: number;
  from?: string;
  to?: string;
};

export type EventsIngestionRunInfo = {
  id: string;
  ok: boolean;
  createdAt: string;
  durationMs?: number | null;
  message?: string | null;
  error?: string | null;
  meta?: LastRunMeta | null;
};

type Props = {
  locale: Locale;
  messages: EventsIngestionMessages;
  lastRun: EventsIngestionRunInfo | null;
};

export function EventsIngestionPanel({ locale, messages, lastRun }: Props): JSX.Element {
  const [state, formAction] = useActionState<EventsIngestionFormState, FormData>(
    triggerEventsIngestionAction,
    INITIAL_EVENTS_INGESTION_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const lastRunMeta = useMemo(() => extractMeta(lastRun?.meta), [lastRun?.meta]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.title}</p>
          <p className="text-sm text-slate-400">{messages.description}</p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" action={formAction}>
          <input type="hidden" name="locale" value={locale} />
          <label className="text-xs text-slate-400">
            {messages.selectLabel}
            <select
              name="lookaheadDays"
              defaultValue="30"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {Object.entries(messages.selectOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton label={messages.button} />
        </form>
      </div>

      {state.ok === true && state.result ? (
        <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {messages.resultLabel}: {state.message}
        </p>
      ) : null}
      {state.ok === false && state.error ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.lastRunLabel}</p>
        {lastRun ? (
          <dl className="mt-3 space-y-2 text-sm text-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  lastRun.ok ? "border border-emerald-400/40 text-emerald-200" : "border border-rose-400/40 text-rose-200"
                }`}
              >
                {lastRun.ok ? messages.statusSuccess : messages.statusFailed}
              </span>
              <span className="text-slate-400">
                {messages.runAtLabel}: {formatDate(locale, lastRun.createdAt)}
              </span>
              {typeof lastRun.durationMs === "number" ? (
                <span className="text-slate-500">({formatDuration(lastRun.durationMs)})</span>
              ) : null}
            </div>
            <div className="text-slate-300">{lastRun.message}</div>
            {lastRunMeta ? (
              <>
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>
                    {messages.countsLabel}: {lastRunMeta.imported ?? 0} / {lastRunMeta.updated ?? 0} /{" "}
                    {lastRunMeta.skipped ?? 0}
                  </span>
                  <span>
                    {messages.windowLabel}: {formatDate(locale, lastRunMeta.from)} – {formatDate(locale, lastRunMeta.to)}
                  </span>
                </div>
              </>
            ) : null}
            {!lastRun.ok && lastRun.error ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
                {messages.errorLabel}: {truncate(lastRun.error, 200)}
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{messages.noRuns}</p>
        )}
      </div>
    </section>
  );
}

const INITIAL_EVENTS_INGESTION_STATE: EventsIngestionFormState = { ok: null };

function extractMeta(meta?: LastRunMeta | null) {
  if (!meta) return null;
  return {
    imported: typeof meta.imported === "number" ? meta.imported : undefined,
    updated: typeof meta.updated === "number" ? meta.updated : undefined,
    skipped: typeof meta.skipped === "number" ? meta.skipped : undefined,
    from: typeof meta.from === "string" ? meta.from : undefined,
    to: typeof meta.to === "string" ? meta.to : undefined,
  };
}

function formatDate(locale: Locale, value?: string) {
  if (!value) return "–";
  try {
    const date = new Date(value);
    return date.toLocaleString(locale === "de" ? "de-DE" : "en-US");
  } catch {
    return value;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-sky-600/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? `${label}…` : label}
    </button>
  );
}
