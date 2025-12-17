"use client";

import { useEffect, useActionState, useState } from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n";
import {
  triggerEventsDedupSweepAction,
  type EventsDedupSweepFormState,
} from "@/src/app/[locale]/admin/(panel)/ops/eventsDedupSweepAction";

type EventsDedupMessages = {
  title: string;
  description: string;
  daysBackLabel: string;
  daysAheadLabel: string;
  dryRunLabel: string;
  advancedLabel: string;
  buttonDryRun: string;
  buttonRealRun: string;
  realRunWarning: string;
  lastRunLabel: string;
  noRuns: string;
  statusSuccess: string;
  statusFailed: string;
  countsLabel: string;
  windowLabel: string;
  duplicatesLabel: string;
  deletesLabel: string;
  updatesLabel: string;
  dryRunTag: string;
  errorLabel: string;
  resultLabel: string;
};

type DedupRunMeta = {
  groupsProcessed?: number;
  duplicatesFound?: number;
  rowsDeleted?: number;
  rowsUpdated?: number;
  from?: string;
  to?: string;
  dryRun?: boolean;
};

export type EventsDedupRunInfo = {
  id: string;
  ok: boolean;
  createdAt: string;
  durationMs?: number | null;
  message?: string | null;
  error?: string | null;
  meta?: DedupRunMeta | null;
};

type Props = {
  locale: Locale;
  messages: EventsDedupMessages;
  lastRun: EventsDedupRunInfo | null;
};

export function EventsDedupPanel({ locale, messages, lastRun }: Props): JSX.Element {
  const [state, formAction] = useActionState<EventsDedupSweepFormState, FormData>(
    triggerEventsDedupSweepAction,
    INITIAL_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const [isDryRun, setIsDryRun] = useState(true);
  const buttonLabel = isDryRun ? messages.buttonDryRun : messages.buttonRealRun;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.title}</p>
            <p className="text-sm text-slate-400">{messages.description}</p>
          </div>
          <form className="flex flex-col gap-3 sm:items-end" action={formAction}>
            <input type="hidden" name="locale" value={locale} />
            <details className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">{messages.advancedLabel}</summary>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <NumberField name="daysBack" label={messages.daysBackLabel} defaultValue={7} min={0} max={60} />
                <NumberField name="daysAhead" label={messages.daysAheadLabel} defaultValue={21} min={0} max={60} />
              </div>
            </details>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                name="dryRun"
                defaultChecked
                className="rounded border-slate-600 bg-slate-900"
                onChange={(event) => setIsDryRun(event.currentTarget.checked)}
              />
              {messages.dryRunLabel}
            </label>
            {!isDryRun ? (
              <p className="text-xs text-amber-300">{messages.realRunWarning}</p>
            ) : null}
            <SubmitButton label={buttonLabel} />
          </form>
        </div>
        {state.ok === true && state.message ? (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {messages.resultLabel}: {state.message}
          </p>
        ) : null}
        {state.ok === false && state.error ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.lastRunLabel}</p>
        {lastRun ? <LastRunDetails locale={locale} run={lastRun} messages={messages} /> : (
          <p className="mt-2 text-sm text-slate-400">{messages.noRuns}</p>
        )}
      </div>
    </section>
  );
}

const INITIAL_STATE: EventsDedupSweepFormState = { ok: null };

function NumberField({
  name,
  label,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
}) {
  return (
    <label className="text-xs text-slate-400">
      {label}
      <input
        type="number"
        name={name}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="mt-1 w-24 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}

function LastRunDetails({
  locale,
  run,
  messages,
}: {
  locale: Locale;
  run: EventsDedupRunInfo;
  messages: EventsDedupMessages;
}): JSX.Element {
  const meta = run.meta ?? {};
  return (
    <dl className="mt-3 space-y-2 text-sm text-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            run.ok ? "border border-emerald-400/40 text-emerald-200" : "border border-rose-400/40 text-rose-200"
          }`}
        >
          {run.ok ? messages.statusSuccess : messages.statusFailed}
        </span>
        {meta.dryRun ? (
          <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-xs text-amber-200">
            {messages.dryRunTag}
          </span>
        ) : null}
        <span className="text-slate-400">
          {formatDate(locale, run.createdAt)} {run.durationMs ? `(${formatDuration(run.durationMs)})` : ""}
        </span>
      </div>
      {run.message ? <div className="text-slate-300">{run.message}</div> : null}
      <div className="text-xs text-slate-400">
        <div>
          {messages.countsLabel}: {meta.groupsProcessed ?? 0}
        </div>
        <div>
          {messages.duplicatesLabel}: {meta.duplicatesFound ?? 0}
        </div>
        <div>
          {messages.deletesLabel}: {meta.rowsDeleted ?? 0} · {messages.updatesLabel}: {meta.rowsUpdated ?? 0}
        </div>
        <div>
          {messages.windowLabel}: {formatDate(locale, meta.from)} – {formatDate(locale, meta.to)}
        </div>
      </div>
      {!run.ok && run.error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
          {messages.errorLabel}: {truncate(run.error, 200)}
        </div>
      ) : null}
    </dl>
  );
}

function formatDate(locale: Locale, value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-US");
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
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
