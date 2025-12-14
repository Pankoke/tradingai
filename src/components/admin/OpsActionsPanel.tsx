"use client";

import { useCallback, useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import type { Locale } from "@/i18n";
import { JsonReveal } from "@/src/components/admin/JsonReveal";

type ActionKey = "perception" | "marketdata" | "bias";

type ActionResult = {
  ok: boolean;
  message: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  details?: unknown;
  errorCode?: string;
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
  };
};

type Props = {
  locale: Locale;
  messages: OpsMessages;
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

export function OpsActionsPanel({ locale, messages }: Props): JSX.Element {
  const [states, setStates] = useState<Record<ActionKey, ActionState>>({
    perception: { status: "idle" },
    marketdata: { status: "idle" },
    bias: { status: "idle" },
  });
  const [symbol, setSymbol] = useState("");

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
          updateState(config.key, {
            status: "error",
            lastResult: data ?? {
              ok: false,
              message: "Unknown error",
            },
          });
          return;
        }
        updateState(config.key, {
          status: "success",
          lastResult: data,
        });
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
    [updateState],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {configs.map((config) => {
        const state = states[config.key];
        const lastRun = formatTimestamp(state.lastResult?.finishedAt ?? state.lastResult?.startedAt, locale);
        const duration = formatDuration(state.lastResult?.durationMs);
        const hasDetails = state.lastResult?.details != null;
        const isMarketData = config.key === "marketdata";
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

            <button
              type="button"
              onClick={() =>
                executeAction(config, config.key === "marketdata" ? { symbol: symbol || undefined } : undefined)
              }
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
    </div>
  );
}
