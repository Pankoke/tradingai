"use client";

import clsx from "clsx";
import type { JSX } from "react";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { useT } from "@/src/lib/i18n/ClientProvider";

type CopyLabels = {
  copy: string;
  copied: string;
};

type ActionCardsProps = {
  entry: { display: string; noteKey: string; copyValue: string | null };
  stop: { display: string; noteKey: string; copyValue: string | null };
  takeProfit: { display: string; noteKey: string; copyValue: string | null };
  copyLabels: CopyLabels;
  variant?: "full" | "mini";
};

const actionToneStyles: Record<"neutral" | "danger" | "success", string> = {
  neutral: "border-slate-800 bg-[#0f172a]/80",
  danger: "border-rose-500/40 bg-rose-500/10",
  success: "border-emerald-500/40 bg-emerald-500/10",
};

const actionToneValue: Record<"neutral" | "danger" | "success", string> = {
  neutral: "text-slate-100",
  danger: "text-rose-200",
  success: "text-emerald-200",
};

export function SetupActionCards({ entry, stop, takeProfit, copyLabels, variant = "full" }: ActionCardsProps): JSX.Element {
  const t = useT();
  const compact = variant === "mini";
  const padding = compact ? "px-3 py-2" : "px-4 py-3";
  const valueSize = compact ? "text-sm" : "text-lg";
  const noteSize = compact ? "text-[0.65rem]" : "text-xs";

  return (
    <div className={clsx("grid gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-3")}>
      <ActionCard
        label={t("setups.entry")}
        value={entry.display}
        note={t(entry.noteKey)}
        tone="neutral"
        copyValue={entry.copyValue}
        copyLabels={copyLabels}
        padding={padding}
        valueSize={valueSize}
        noteSize={noteSize}
      />
      <ActionCard
        label={t("setups.stopLoss")}
        value={stop.display}
        note={t(stop.noteKey)}
        tone="danger"
        copyValue={stop.copyValue}
        copyLabels={copyLabels}
        padding={padding}
        valueSize={valueSize}
        noteSize={noteSize}
      />
      <ActionCard
        label={t("setups.takeProfit")}
        value={takeProfit.display}
        note={t(takeProfit.noteKey)}
        tone="success"
        copyValue={takeProfit.copyValue}
        copyLabels={copyLabels}
        padding={padding}
        valueSize={valueSize}
        noteSize={noteSize}
      />
    </div>
  );
}

type ActionCardProps = {
  label: string;
  value: string;
  note: string;
  tone: "neutral" | "danger" | "success";
  copyValue?: string | null;
  copyLabels: CopyLabels;
  padding: string;
  valueSize: string;
  noteSize: string;
};

function ActionCard({
  label,
  value,
  note,
  tone,
  copyValue,
  copyLabels,
  padding,
  valueSize,
  noteSize,
}: ActionCardProps): JSX.Element {
  const t = useT();
  const canCopy = Boolean(copyValue);

  return (
    <div
      className={clsx(
        "rounded-2xl border shadow-[0_20px_45px_rgba(2,6,23,0.45)] transition",
        actionToneStyles[tone],
        padding,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">{label}</p>
          <p className={clsx("font-semibold text-white", valueSize)}>{value}</p>
          <p className={clsx("text-slate-400", noteSize)}>{note}</p>
        </div>
        {canCopy ? (
          <button
            type="button"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-sky-300 transition hover:text-sky-200"
            onClick={() => {
              if (copyValue) {
                void navigator.clipboard?.writeText(copyValue);
              }
            }}
            aria-label={t("setups.action.copy")}
          >
            {copyLabels.copy}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function buildActionCardData(
  vm: SetupViewModel,
  formatter: Intl.NumberFormat,
  opts: { copyLabels: CopyLabels },
): {
  entry: ActionCardsProps["entry"];
  stop: ActionCardsProps["stop"];
  takeProfit: ActionCardsProps["takeProfit"];
  copyLabels: CopyLabels;
} {
  const entryDescriptor = formatEntryDescriptorFromVm(vm, formatter);
  const stopInfo = formatPriceValueFromVm(vm.stop, formatter);
  const takeProfitInfo = formatPriceValueFromVm(vm.takeProfit, formatter);
  const stopNoteKey = deriveStopNoteKey(vm.levelDebug ?? undefined);

  return {
    entry: entryDescriptor,
    stop: { display: stopInfo.display, noteKey: stopNoteKey, copyValue: stopInfo.copyValue },
    takeProfit: {
      display: takeProfitInfo.display,
      noteKey: "setups.takeProfit.note.primary",
      copyValue: takeProfitInfo.copyValue,
    },
    copyLabels: opts.copyLabels,
  };
}

function formatEntryDescriptorFromVm(
  vm: SetupViewModel,
  formatter: Intl.NumberFormat,
): { display: string; noteKey: string; copyValue: string | null } {
  const range = vm.entry;
  if (range.from === null && range.to === null) {
    if (range.display) {
      return { display: range.display, noteKey: "setups.entry.note.default", copyValue: range.display };
    }
    return { display: "n/a", noteKey: "setups.entry.note.default", copyValue: null };
  }
  if (range.from !== null && range.to !== null && range.from !== range.to) {
    return {
      display: `${formatter.format(range.from)} - ${formatter.format(range.to)}`,
      noteKey: "setups.entry.note.zone",
      copyValue: `${range.from} - ${range.to}`,
    };
  }
  if (range.from !== null) {
    return {
      display: formatter.format(range.from),
      noteKey: "setups.entry.note.limit",
      copyValue: String(range.from),
    };
  }
  if (range.display) {
    return { display: range.display, noteKey: "setups.entry.note.default", copyValue: range.display };
  }
  return { display: "n/a", noteKey: "setups.entry.note.default", copyValue: null };
}

function formatPriceValueFromVm(
  point: { value: number | null; display?: string },
  formatter: Intl.NumberFormat,
): { display: string; copyValue: string | null } {
  if (point.value === null || Number.isNaN(point.value)) {
    if (point.display) {
      return { display: point.display, copyValue: point.display };
    }
    return { display: "n/a", copyValue: null };
  }
  return {
    display: formatter.format(point.value),
    copyValue: String(point.value),
  };
}

function deriveStopNoteKey(
  levelDebug?: SetupViewModel["levelDebug"],
): "setups.stop.note.structure" | "setups.stop.note.volatility" | "setups.stop.note.default" {
  if (!levelDebug?.category && levelDebug?.volatilityScore == null) {
    return "setups.stop.note.default";
  }
  const category = levelDebug?.category?.toLowerCase() ?? "";
  if (category.includes("struct") || category.includes("range") || category.includes("swing")) {
    return "setups.stop.note.structure";
  }
  if (category.includes("volatility") || (typeof levelDebug?.volatilityScore === "number" && levelDebug.volatilityScore >= 60)) {
    return "setups.stop.note.volatility";
  }
  return "setups.stop.note.default";
}
