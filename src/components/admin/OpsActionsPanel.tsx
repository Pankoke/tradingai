"use client";

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import type { Locale } from "@/i18n";
import { JsonReveal } from "@/src/components/admin/JsonReveal";
import type { SnapshotBuildSource } from "@/src/features/perception/build/buildSetups";

type ActionKey = "perception" | "marketdata" | "bias";

type ActionResult = {
  ok: boolean;
  message: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  details?: unknown;
  errorCode?: string;
  lastSnapshot?: {
    snapshotId?: string;
    snapshotTime?: string;
    source?: string;
    reused?: boolean;
  };
  lockStatus?: {
    locked: boolean;
    source?: string;
    startedAt?: string;
    expiresAt?: string;
    remainingMs?: number;
    state?: BuildStatusState;
  };
};

type ActionState = {
  status: "idle" | "running" | "success" | "error";
  lastResult?: ActionResult;
};

type OpsMessages = {
  title: string;
  description: string;
  disabledLabel: string;
  perception: {
    title: string;
    description: string;
    button: string;
    lastSourceLabel: string;
    snapshotTimeLabel: string;
    sources: Record<SnapshotSourceLabel, string>;
    forceLabel: string;
    buildRunning: string;
    locked: string;
    unlocked: string;
    lockSourceLabel: string;
    lockSinceLabel: string;
    lockEtaLabel: string;
    forceConfirm: {
      title: string;
      body: string;
      cancel: string;
      confirm: string;
    };
  };
  marketdata: {
    title: string;
    description: string;
    button: string;
    symbolLabel: string;
    symbolPlaceholder: string;
    runAllLabel: string;
  };
  bias: {
    title: string;
    description: string;
    button: string;
  };
  status: {
    idle: string;
    running: string;
    success: string;
    error: string;
    lastRun: string;
    duration: string;
    output: string;
    none: string;
  };
  common: {
    showDetails: string;
    hideDetails: string;
    refresh?: string;
  };
  eventsIngestion: {
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
};

type Props = {
  locale: Locale;
  messages: OpsMessages;
  latestSnapshot?: LatestSnapshotInfo | null;
  initialLockStatus?: LockStatusState;
};

type ActionConfig = {
  key: ActionKey;
  title: string;
  description: string;
  buttonLabel: string;
  endpoint: string;
};

const STATUS_TONES: Record<ActionState["status"], string> = {
  idle: "border-slate-600/60 text-slate-400",
  running: "border-amber-400/60 text-amber-200",
  success: "border-emerald-400/60 text-emerald-200",
  error: "border-rose-400/60 text-rose-200",
};

function formatTimestamp(value?: string, locale?: Locale): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-US");
  } catch {
    return value;
  }
}

function formatDuration(ms?: number): string | null {
  if (ms == null) return null;
  if (ms < 1000) return `${ms} ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

type SnapshotSourceLabel = SnapshotBuildSource | "unknown";

type LatestSnapshotInfo = {
  snapshotId?: string;
  snapshotTime?: string;
  source: SnapshotSourceLabel;
} | null;

export type BuildStatusState = {
  status: "idle" | "running" | "succeeded" | "failed";
  source?: SnapshotSourceLabel;
  startedAt?: string;
  finishedAt?: string;
  error?: string | null;
  reused?: boolean;
};

export type LockStatusState = {
  locked: boolean;
  source?: SnapshotSourceLabel;
  startedAt?: string;
  expiresAt?: string;
  remainingMs?: number;
  state?: BuildStatusState;
};

export function OpsActionsPanel({
  locale,
  messages,
  latestSnapshot,
  initialLockStatus,
}: Props): JSX.Element {
  const [states, setStates] = useState<Record<ActionKey, ActionState>>({
    perception: { status: "idle" },
    marketdata: { status: "idle" },
    bias: { status: "idle" },
  });
  const [symbol, setSymbol] = useState("");
  const [forceRebuild, setForceRebuild] = useState(false);
  const [latestSnapshotState, setLatestSnapshotState] = useState<LatestSnapshotInfo>(latestSnapshot ?? null);
  const [lockStatus, setLockStatus] = useState<LockStatusState>(initialLockStatus ?? { locked: false });
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [pendingForceAction, setPendingForceAction] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLatestSnapshotState(latestSnapshot ?? null);
  }, [latestSnapshot?.snapshotId, latestSnapshot?.snapshotTime, latestSnapshot?.source, latestSnapshot]);

  useEffect(() => {
    if (initialLockStatus) {
      setLockStatus(initialLockStatus);
    }
  }, [initialLockStatus?.locked, initialLockStatus?.source, initialLockStatus?.startedAt, initialLockStatus?.expiresAt]);

  const configs: ActionConfig[] = useMemo(
    () => [
      {
        key: "perception",
        title: messages.perception.title,
        description: messages.perception.description,
        buttonLabel: messages.perception.button,
        endpoint: "/api/admin/ops/perception",
      },
      {
        key: "marketdata",
        title: messages.marketdata.title,
        description: messages.marketdata.description,
        buttonLabel: messages.marketdata.button,
        endpoint: "/api/admin/ops/marketdata",
      },
      {
        key: "bias",
        title: messages.bias.title,
        description: messages.bias.description,
        buttonLabel: messages.bias.button,
        endpoint: "/api/admin/ops/bias",
      },
    ],
    [messages],
  );

  const updateState = useCallback((key: ActionKey, partial: Partial<ActionState>) => {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/ops/perception", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data: ActionResult = await response.json();
      if (response.ok && data.ok) {
        if (data.lastSnapshot) {
          setLatestSnapshotState({
            snapshotId: data.lastSnapshot.snapshotId,
            snapshotTime: data.lastSnapshot.snapshotTime,
            source: (data.lastSnapshot.source as SnapshotSourceLabel) ?? "unknown",
          });
        }
        if (data.lockStatus) {
          setLockStatus({
            locked: data.lockStatus.locked,
            source: data.lockStatus.source as SnapshotSourceLabel | undefined,
            startedAt: data.lockStatus.startedAt,
            expiresAt: data.lockStatus.expiresAt,
            remainingMs: data.lockStatus.remainingMs,
            state: data.lockStatus.state
              ? {
                  ...data.lockStatus.state,
                  source: data.lockStatus.state.source as SnapshotSourceLabel | undefined,
                }
              : undefined,
          });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!lockStatus.locked) return undefined;
    const id = window.setInterval(() => {
      refreshStatus();
    }, 10000);
    return () => window.clearInterval(id);
  }, [lockStatus.locked, refreshStatus]);

  const executeAction = useCallback(
    async (config: ActionConfig, payload?: Record<string, unknown>) => {
      updateState(config.key, { status: "running" });
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload ?? {}),
        });
        const data: ActionResult = await response.json();
        if (!response.ok || !data.ok) {
          const messageOverride =
            response.status === 409 && config.key === "perception" ? messages.perception.buildRunning : undefined;
          updateState(config.key, {
            status: "error",
            lastResult: data ?? {
              ok: false,
              message: messageOverride ?? "Unknown error",
            },
          });
          if (data?.lockStatus) {
            setLockStatus({
              locked: data.lockStatus.locked,
              source: data.lockStatus.source as SnapshotSourceLabel | undefined,
              startedAt: data.lockStatus.startedAt,
              expiresAt: data.lockStatus.expiresAt,
              remainingMs: data.lockStatus.remainingMs,
              state: data.lockStatus.state
                ? {
                    ...data.lockStatus.state,
                    source: data.lockStatus.state.source as SnapshotSourceLabel | undefined,
                  }
                : undefined,
            });
          }
          return;
        }
        updateState(config.key, {
          status: "success",
          lastResult: data,
        });
        if (config.key === "perception") {
          setForceRebuild(false);
          if (data.details && typeof data.details === "object") {
            const info = data.details as { snapshotId?: string; snapshotTime?: string; source?: SnapshotSourceLabel };
            setLatestSnapshotState((prev) => ({
              snapshotId: info.snapshotId ?? prev?.snapshotId,
              snapshotTime: info.snapshotTime ?? prev?.snapshotTime,
              source: info.source ?? prev?.source ?? "unknown",
            }));
          }
          if (data.lockStatus) {
            setLockStatus({
              locked: data.lockStatus.locked,
              source: data.lockStatus.source as SnapshotSourceLabel | undefined,
              startedAt: data.lockStatus.startedAt,
              expiresAt: data.lockStatus.expiresAt,
              remainingMs: data.lockStatus.remainingMs,
              state: data.lockStatus.state
                ? {
                    ...data.lockStatus.state,
                    source: data.lockStatus.state.source as SnapshotSourceLabel | undefined,
                  }
                : undefined,
            });
          }
          await refreshStatus();
        }
      } catch (error) {
        updateState(config.key, {
          status: "error",
          lastResult: {
            ok: false,
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    },
    [messages.perception.buildRunning, refreshStatus, updateState],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {configs.map((config) => {
        const state = states[config.key];
        const lastRun = formatTimestamp(state.lastResult?.finishedAt ?? state.lastResult?.startedAt, locale);
        const duration = formatDuration(state.lastResult?.durationMs);
        const hasDetails = state.lastResult?.details != null;
        const isMarketData = config.key === "marketdata";
        const isPerception = config.key === "perception";
        const lastSourceLabel = latestSnapshotState
          ? messages.perception.sources[latestSnapshotState.source] ?? messages.perception.sources.unknown
          : messages.perception.sources.unknown;
        const lockTone = lockStatus.locked ? "bg-amber-500/20 text-amber-200 border-amber-400/50" : "bg-emerald-500/20 text-emerald-200 border-emerald-400/50";
        return (
          <div key={config.key} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{config.title}</p>
                <p className="mt-2 text-sm text-slate-300">{config.description}</p>
              </div>
              <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", STATUS_TONES[state.status])}>
                {messages.status[state.status]}
              </span>
            </div>

            {isMarketData && (
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  {messages.marketdata.symbolLabel}
                  <input
                    type="text"
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    placeholder={messages.marketdata.symbolPlaceholder}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <p className="text-xs text-slate-500">{messages.marketdata.runAllLabel}</p>
              </div>
            )}
            {isPerception && (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/40 p-3 text-xs text-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx("rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold", lockTone)}>
                    {lockStatus.locked ? messages.perception.locked : messages.perception.unlocked}
                  </span>
                  {messages.common.refresh && (
                    <button
                      type="button"
                      onClick={refreshStatus}
                      disabled={isRefreshing}
                      className="rounded border border-slate-700 px-2 py-1 text-[0.65rem] text-slate-200 hover:border-sky-500"
                    >
                      {isRefreshing ? "…" : messages.common.refresh}
                    </button>
                  )}
                </div>
                <p>
                  {messages.perception.lastSourceLabel}:{" "}
                  <span className="font-semibold text-slate-100">{lastSourceLabel}</span>
                </p>
                <p>
                  {messages.perception.snapshotTimeLabel}:{" "}
                  <span className="text-slate-100">
                    {latestSnapshotState?.snapshotTime
                      ? formatTimestamp(latestSnapshotState.snapshotTime, locale) ?? latestSnapshotState.snapshotTime
                      : messages.status.none}
                  </span>
                </p>
                {lockStatus.locked && (
                  <div className="space-y-1 text-[0.7rem] text-slate-400">
                    <p>
                      {messages.perception.lockSourceLabel}:{" "}
                      <span className="text-slate-100">
                        {lockStatus.source
                          ? messages.perception.sources[lockStatus.source] ?? lockStatus.source
                          : messages.perception.sources.unknown}
                      </span>
                    </p>
                    <p>
                      {messages.perception.lockSinceLabel}:{" "}
                      <span className="text-slate-100">
                        {lockStatus.startedAt
                          ? formatTimestamp(lockStatus.startedAt, locale) ?? lockStatus.startedAt
                          : "–"}
                      </span>
                    </p>
                    <p>
                      {messages.perception.lockEtaLabel}:{" "}
                      <span className="text-slate-100">
                        {lockStatus.remainingMs != null
                          ? `${Math.ceil(lockStatus.remainingMs / 1000)}s`
                          : lockStatus.expiresAt
                            ? formatTimestamp(lockStatus.expiresAt, locale)
                            : "–"}
                      </span>
                    </p>
                  </div>
                )}
                <label className="mt-1 flex items-center gap-2 text-[0.7rem] text-slate-400">
                  <input
                    type="checkbox"
                    checked={forceRebuild}
                    onChange={(event) => setForceRebuild(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  {messages.perception.forceLabel}
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleRunClick(config)}
              disabled={state.status === "running"}
              className={clsx(
                "mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition",
                state.status === "running"
                  ? "cursor-not-allowed border border-slate-600 bg-slate-800 text-slate-400"
                  : "border border-sky-500/60 bg-sky-500/10 text-sky-200 hover:border-sky-400 hover:bg-sky-500/20",
              )}
            >
              {state.status === "running" ? messages.status.running : config.buttonLabel}
            </button>

            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <p>
                {messages.status.lastRun}: <span className="text-slate-200">{lastRun ?? messages.status.none}</span>
              </p>
              {duration && (
                <p>
                  {messages.status.duration}: <span className="text-slate-200">{duration}</span>
                </p>
              )}
              {state.lastResult && (
                <p className="text-slate-300">
                  {messages.status.output}: <span className="text-slate-200">{state.lastResult.message}</span>
                </p>
              )}
            </div>

            {hasDetails && (
              <JsonReveal
                data={state.lastResult?.details}
                showLabel={messages.common.showDetails}
                hideLabel={messages.common.hideDetails}
                className="mt-3"
              />
            )}
          </div>
        );
      })}
      {forceConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-slate-100 shadow-xl">
            <h2 className="text-lg font-semibold">{messages.perception.forceConfirm.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{messages.perception.forceConfirm.body}</p>
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setForceConfirmOpen(false);
                  setPendingForceAction(null);
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:border-slate-400"
              >
                {messages.perception.forceConfirm.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForceConfirmOpen(false);
                  const action = pendingForceAction;
                  setPendingForceAction(null);
                  action?.();
                }}
                className="rounded-lg border border-rose-400 bg-rose-500/20 px-4 py-2 text-rose-100 hover:border-rose-200"
              >
                {messages.perception.forceConfirm.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleRunClick(config: ActionConfig) {
    if (config.key === "perception") {
      const payload = { force: forceRebuild };
      if (forceRebuild) {
        setPendingForceAction(() => () => executeAction(config, payload));
        setForceConfirmOpen(true);
        return;
      }
      executeAction(config, payload);
      return;
    }
    if (config.key === "marketdata") {
      executeAction(config, { symbol: symbol || undefined });
      return;
    }
    executeAction(config);
  }
}
