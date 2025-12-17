"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { JSX } from "react";
import type { Locale } from "@/i18n";
import {
  triggerEventsEnrichmentAction,
  type EventsEnrichmentFormState,
} from "@/src/app/[locale]/admin/(panel)/ops/eventsEnrichmentAction";

type PanelMessages = {
  title: string;
  description: string;
  enabledLabel: string;
  limitLabel: string;
  candidatesLabel: string;
  coverageLabel: string;
  fallbackLabel: string;
  lastEnrichedLabel: string;
  lastRunLabel: string;
  noRuns: string;
  statusSuccess: string;
  statusFailed: string;
  countsLabel: string;
  retriesLabel: string;
  skippedLowValueLabel: string;
  skippedAlreadyLabel: string;
  runAtLabel: string;
  button: string;
  disabledNote: string;
  resultLabel: string;
  manualDisabled: string;
  configEnabledLabel: string;
  configLimitLabel: string;
  configWindowLabel: string;
  configExpectationsLabel: string;
  configExpectationsEnabled: string;
  configExpectationsDisabled: string;
  aiPhilosophyTitle: string;
  aiPhilosophyBody: string;
};

export type EventsEnrichmentStats = {
  total: number;
  enriched: number;
  fallbackOnly: number;
  candidates: number;
  lastEnrichedAt: string | null;
};

type LastRunMeta = {
  enriched?: number;
  failed?: number;
  skipped?: number;
  totalRetries?: number;
  skippedLowValueMacro?: number;
  skippedAlreadyEnriched?: number;
};

export type EventsEnrichmentRunInfo = {
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
  messages: PanelMessages;
  stats: EventsEnrichmentStats;
  lastRun: EventsEnrichmentRunInfo | null;
  envInfo: {
    enabled: boolean;
    limit: number | null;
    windowSummary: string;
    expectationsEnabled: boolean;
  };
};

const INITIAL_STATE: EventsEnrichmentFormState = { ok: null };

export function EventsEnrichmentPanel({ locale, messages, stats, lastRun, envInfo }: Props): JSX.Element {
  const [state, formAction] = useActionState<EventsEnrichmentFormState, FormData>(
    triggerEventsEnrichmentAction,
    INITIAL_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const coverage = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.enriched / stats.total) * 100);
  }, [stats.total, stats.enriched]);

  const lastRunMeta = useMemo(() => extractMeta(lastRun?.meta), [lastRun?.meta]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.title}</p>
          <p className="text-sm text-slate-400">{messages.description}</p>
          {!envInfo.enabled ? <p className="text-xs text-rose-300">{messages.disabledNote}</p> : null}
        </div>
        <div className="grid gap-3 text-sm text-slate-300 sm:text-right">
          <ConfigRow label={messages.configEnabledLabel} value={envInfo.enabled ? "ON" : "OFF"} />
          <ConfigRow
            label={messages.configLimitLabel}
            value={envInfo.limit ? envInfo.limit.toString() : "-"}
          />
          <ConfigRow label={messages.configWindowLabel} value={envInfo.windowSummary} />
          <ConfigRow
            label={messages.configExpectationsLabel}
            value={
              envInfo.expectationsEnabled
                ? messages.configExpectationsEnabled
                : messages.configExpectationsDisabled
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={messages.coverageLabel} value={`${stats.enriched} / ${stats.total}`} helper={`${coverage}%`} />
        <StatCard label={messages.candidatesLabel} value={String(stats.candidates)} />
        <StatCard label={messages.fallbackLabel} value={String(stats.fallbackOnly)} />
        <StatCard
          label={messages.lastEnrichedLabel}
          value={stats.lastEnrichedAt ? formatDate(locale, stats.lastEnrichedAt) : "-"}
        />
      </div>

      {envInfo.enabled ? (
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" action={formAction}>
          <input type="hidden" name="locale" value={locale} />
          <SubmitButton label={messages.button} />
        </form>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-400">
          {messages.manualDisabled}
        </p>
      )}

      {state.ok === true && state.message ? (
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
            {lastRun.message ? <div className="text-slate-300">{lastRun.message}</div> : null}
            {lastRunMeta ? (
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span>
                  {messages.countsLabel}: {lastRunMeta.enriched ?? 0} / {lastRunMeta.failed ?? 0} /{" "}
                  {lastRunMeta.skipped ?? 0}
                </span>
                {typeof lastRunMeta.totalRetries === "number" ? (
                  <span>
                    {messages.retriesLabel}: {lastRunMeta.totalRetries}
                  </span>
                ) : null}
                {typeof lastRunMeta.skippedLowValueMacro === "number" ? (
                  <span>
                    {messages.skippedLowValueLabel}: {lastRunMeta.skippedLowValueMacro}
                  </span>
                ) : null}
                {typeof lastRunMeta.skippedAlreadyEnriched === "number" ? (
                  <span>
                    {messages.skippedAlreadyLabel}: {lastRunMeta.skippedAlreadyEnriched}
                  </span>
                ) : null}
              </div>
            ) : null}
            {!lastRun.ok && lastRun.error ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
                {lastRun.error}
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{messages.noRuns}</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages.aiPhilosophyTitle}</p>
        <p className="mt-1 text-slate-400">{messages.aiPhilosophyBody}</p>
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

function StatCard({ label, value, helper }: StatCardProps): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-slate-200">{value}</p>
    </div>
  );
}

function extractMeta(meta?: LastRunMeta | null) {
  if (!meta) return null;
  return {
    enriched: typeof meta.enriched === "number" ? meta.enriched : undefined,
    failed: typeof meta.failed === "number" ? meta.failed : undefined,
    skipped: typeof meta.skipped === "number" ? meta.skipped : undefined,
    totalRetries: typeof meta.totalRetries === "number" ? meta.totalRetries : undefined,
    skippedLowValueMacro:
      typeof meta.skippedLowValueMacro === "number" ? meta.skippedLowValueMacro : undefined,
    skippedAlreadyEnriched:
      typeof meta.skippedAlreadyEnriched === "number" ? meta.skippedAlreadyEnriched : undefined,
  };
}

function formatDate(locale: Locale, value?: string | null) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleString(locale === "de" ? "de-DE" : "en-US");
  } catch {
    return value;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-sky-600/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}
