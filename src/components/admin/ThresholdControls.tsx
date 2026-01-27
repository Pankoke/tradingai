"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InfoTooltip } from "@/src/components/admin/InfoTooltip";
import { helpText } from "@/src/components/admin/thresholdsHelpText";

type ThresholdControlsProps = {
  closedOnly: boolean;
  includeNoTrade: boolean;
  useConf: boolean;
  limit?: number;
  minClosedTotal?: number;
  minHits?: number;
  lastRun?: { timestamp?: number; durationMs?: number };
};

type DraftState = {
  closedOnly: boolean;
  includeNoTrade: boolean;
  useConf: boolean;
  limit?: number;
  minClosedTotal?: number;
  minHits?: number;
};

const AUTO_APPLY_DEBOUNCE_MS = 800;

function parseNumber(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function ThresholdControls({
  closedOnly,
  includeNoTrade,
  useConf,
  limit,
  minClosedTotal,
  minHits,
  lastRun,
}: ThresholdControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [autoApply, setAutoApply] = useState(false);

  const applied: DraftState = useMemo(
    () => ({ closedOnly, includeNoTrade, useConf, limit, minClosedTotal, minHits }),
    [closedOnly, includeNoTrade, useConf, limit, minClosedTotal, minHits],
  );
  const [draft, setDraft] = useState<DraftState>(applied);
  const [lastAppliedAt, setLastAppliedAt] = useState<number | undefined>(lastRun?.timestamp);
  const managerRef = useMemo(() => createAutoApplyManager(AUTO_APPLY_DEBOUNCE_MS), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(applied);
  }, [applied.closedOnly, applied.includeNoTrade, applied.useConf, applied.limit, applied.minClosedTotal, applied.minHits]);

  const dirty = isDraftDirty(applied, draft);

  const setNumberField = (key: keyof DraftState) => (value: string) => {
    const trimmed = value.trim();
    if (!trimmed.length) {
      setDraft((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return;
    setDraft((prev) => ({ ...prev, [key]: parsed }));
  };

  const toggleField = (key: keyof DraftState) => {
    setDraft((prev) => ({ ...prev, [key]: !(prev[key] as boolean) }));
  };

  const applyDraft = () => {
    startTransition(() => {
      const next = applyDraftToParams(searchParams?.toString() ?? "", pathname, draft);
      router.push(next);
      setLastAppliedAt(Date.now());
    });
  };

  const resetDraft = () => setDraft(applied);

  useEffect(() => {
    managerRef.update({
      autoApply,
      dirty,
      isPending,
      onApply: applyDraft,
    });
    return () => managerRef.cancel();
  }, [autoApply, dirty, isPending, draft, managerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const formattedLastRun = lastAppliedAt ? new Date(lastAppliedAt).toLocaleTimeString() : null;
  const durationText =
    lastRun?.durationMs !== undefined ? `${(lastRun.durationMs / 1000).toFixed(2)}s` : undefined;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
      <button
        type="button"
        onClick={() => toggleField("closedOnly")}
        className={`rounded-full px-3 py-1 font-semibold ${
          draft.closedOnly ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
        }`}
      >
        Closed-only {draft.closedOnly ? "on" : "off"}
      </button>
      <InfoTooltip text={helpText.closedOnly} />

      <button
        type="button"
        onClick={() => toggleField("includeNoTrade")}
        className={`rounded-full px-3 py-1 font-semibold ${
          draft.includeNoTrade ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
        }`}
      >
        include NO_TRADE {draft.includeNoTrade ? "on" : "off"}
      </button>
      <InfoTooltip text={helpText.includeNoTrade} />

      <button
        type="button"
        onClick={() => toggleField("useConf")}
        className={`rounded-full px-3 py-1 font-semibold ${
          draft.useConf ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
        }`}
      >
        SQ × Confidence {draft.useConf ? "on" : "off"}
      </button>
      <InfoTooltip text={helpText.confidence} />

      <div className="flex items-center gap-1">
        <label className="text-slate-200">Limit</label>
        <input
          type="number"
          value={parseNumber(draft.limit)}
          min={1}
          className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          onChange={(e) => setNumberField("limit")(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1">
        <label className="text-slate-200">minClosed</label>
        <input
          type="number"
          value={parseNumber(draft.minClosedTotal)}
          min={1}
          className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          onChange={(e) => setNumberField("minClosedTotal")(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1">
        <label className="text-slate-200">minHits</label>
        <input
          type="number"
          value={parseNumber(draft.minHits)}
          min={0}
          className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          onChange={(e) => setNumberField("minHits")(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty || isPending}
          onClick={applyDraft}
          className={`rounded-full px-3 py-1 font-semibold ${
            dirty ? "bg-emerald-500 text-slate-900 hover:bg-emerald-400" : "bg-slate-700 text-slate-300"
          }`}
        >
          {isPending ? "Wird geladen..." : "Simulation ausfuehren"}
        </button>
        <button
          type="button"
          disabled={!dirty || isPending}
          onClick={resetDraft}
          className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          Zuruecksetzen
        </button>
        {dirty ? <span className="text-[11px] text-amber-300">Aenderungen noch nicht angewendet</span> : null}
        <div className="flex items-center gap-1">
          <label className="text-slate-200">Auto-Apply</label>
          <button
            type="button"
            onClick={() => setAutoApply((prev) => !prev)}
            className={`rounded-full px-3 py-1 font-semibold ${
              autoApply ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
            disabled={isPending}
          >
            {autoApply ? "on" : "off"}
          </button>
        </div>
        <div className="text-[11px] text-slate-400">
          {isPending
            ? "Berechne..."
            : formattedLastRun
              ? `Letzte Simulation: ${formattedLastRun}${durationText ? ` · Dauer: ${durationText}` : ""}`
              : "Noch nicht ausgefuehrt"}
        </div>
      </div>
    </div>
  );
}

export function updateSearchParam(params: URLSearchParams, key: string, value: string | null | undefined): URLSearchParams {
  if (value === null || value === undefined || value.length === 0) {
    params.delete(key);
    return params;
  }
  params.set(key, value);
  return params;
}

type AutoApplyOptions = {
  autoApply: boolean;
  dirty: boolean;
  isPending: boolean;
  onApply: () => void;
};

export function createAutoApplyManager(debounceMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const update = (opts: AutoApplyOptions) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!opts.autoApply || !opts.dirty || opts.isPending) {
      return;
    }
    timer = setTimeout(() => {
      opts.onApply();
      timer = null;
    }, debounceMs);
  };
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return { update, cancel };
}

export function isDraftDirty(applied: DraftState, draft: DraftState): boolean {
  return (
    draft.closedOnly !== applied.closedOnly ||
    draft.includeNoTrade !== applied.includeNoTrade ||
    draft.useConf !== applied.useConf ||
    (draft.limit ?? "") !== (applied.limit ?? "") ||
    (draft.minClosedTotal ?? "") !== (applied.minClosedTotal ?? "") ||
    (draft.minHits ?? "") !== (applied.minHits ?? "")
  );
}

export function applyDraftToParams(rawParams: string, pathname: string, draft: DraftState): string {
  const params = new URLSearchParams(rawParams);
  params.set("closedOnly", draft.closedOnly ? "1" : "0");
  params.set("includeNoTrade", draft.includeNoTrade ? "1" : "0");
  params.set("useConf", draft.useConf ? "1" : "0");
  if (draft.limit !== undefined) params.set("limit", String(draft.limit));
  else params.delete("limit");
  if (draft.minClosedTotal !== undefined) params.set("minClosedTotal", String(draft.minClosedTotal));
  else params.delete("minClosedTotal");
  if (draft.minHits !== undefined) params.set("minHits", String(draft.minHits));
  else params.delete("minHits");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
