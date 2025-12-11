"use client";

import type { JSX } from "react";
import clsx from "clsx";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";

type SignalQualityBadgeProps = {
  quality: SignalQuality;
  variant?: "full" | "compact" | "inline";
  className?: string;
};

const toneMap: Record<
  SignalQuality["grade"],
  string
> = {
  A: "border-emerald-500/60 bg-emerald-500/10 text-emerald-100",
  B: "border-sky-500/60 bg-sky-500/10 text-sky-100",
  C: "border-amber-500/70 bg-amber-500/10 text-amber-100",
  D: "border-rose-500/70 bg-rose-500/10 text-rose-100",
};

export function SignalQualityBadge({
  quality,
  variant = "full",
  className,
}: SignalQualityBadgeProps): JSX.Element {
  const t = useT();
  const badgeTone = toneMap[quality.grade];
  const reasonLimit = 3;

  if (variant === "inline") {
    return (
      <div
        className={clsx(
          "flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200",
          className,
        )}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
            {t("perception.signalQuality.label")}
          </span>
          <span className="text-sm font-semibold text-slate-100">
            {t(`perception.signalQuality.inline.${quality.grade}`)}
          </span>
        </div>
        <span
          className={clsx(
            "inline-flex min-w-[2.5rem] items-center justify-center rounded-full border px-3 py-1 text-sm font-bold",
            badgeTone,
          )}
        >
          {quality.grade}
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={clsx(
          "flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2",
          className,
        )}
      >
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
          {t("perception.signalQuality.label")}
        </p>
        <span
          className={clsx(
            "inline-flex min-w-[2.5rem] items-center justify-center rounded-full border px-3 py-1 text-sm font-bold",
            badgeTone,
          )}
        >
          {quality.grade}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-[0_10px_30px_rgba(2,6,23,0.5)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("perception.signalQuality.label")}
          </p>
          <p className="text-sm font-semibold text-slate-100">
            {t(quality.labelKey)}
          </p>
        </div>
        <div className="text-right">
          <span
            className={clsx(
              "inline-flex min-w-[2.5rem] items-center justify-center rounded-full border px-3 py-1 text-sm font-bold",
              badgeTone,
            )}
          >
            {quality.grade}
          </span>
          <div className="text-[0.65rem] text-slate-400">
            {t("perception.signalQuality.scoreHint").replace(
              "{score}",
              String(quality.score),
            )}
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-slate-300">
        {quality.reasons.slice(0, reasonLimit).map((reason) => (
          <li key={reason} className="flex gap-2">
            <span className="text-emerald-400">-</span>
            <span>{t(reason)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
