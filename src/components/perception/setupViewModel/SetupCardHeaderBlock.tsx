"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

type Props = {
  setup: SetupViewModel;
  generatedAtText?: string | null;
  timeframe?: string | null;
  profile?: string | null;
  variant?: "full" | "compact";
  showEyebrow?: boolean;
};

export function SetupCardHeaderBlock({
  setup,
  generatedAtText,
  timeframe,
  profile,
  variant = "full",
  showEyebrow = true,
}: Props): JSX.Element {
  const t = useT();
  const meta = getAssetMeta(setup.assetId, setup.symbol);
  const headline = formatAssetLabel(setup.assetId, setup.symbol);
  const directionLower = setup.direction?.toLowerCase();
  const directionClass =
    directionLower === "long" ? "text-emerald-400" : directionLower === "short" ? "text-rose-400" : "text-slate-300";
  const formattedGeneratedAt = formatGeneratedAt(generatedAtText);
  const chipParts: string[] = [];
  if (profile) chipParts.push(profile);
  if (timeframe) chipParts.push(timeframe.toUpperCase());
  const profileChipLabel = chipParts.length ? chipParts.join(" · ") : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        {showEyebrow ? (
          <p
            className={`font-semibold uppercase tracking-[0.4em] text-slate-200 ${
              variant === "full" ? "text-sm" : "text-xs"
            }`}
          >
            {t("setups.setupOfTheDay")}
          </p>
        ) : (
          <span />
        )}
        {formattedGeneratedAt ? (
          <p className="text-xs font-semibold text-slate-300 sm:text-right">
            {t("perception.generatedAt.label").replace("{value}", formattedGeneratedAt)}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span>{headline}</span>
          <span className={directionClass}> · {setup.direction}</span>
        </h2>
        {profileChipLabel ? (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-200">
              {profileChipLabel}
            </span>
          </div>
        ) : null}
        <p className="text-sm text-slate-400">{meta.name}</p>
      </div>
    </div>
  );
}

function formatGeneratedAt(input?: string | null): string | null {
  if (!input) return null;
  const source = new Date(input);
  if (Number.isNaN(source.getTime())) return null;

  const berlinParts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: false,
  }).formatToParts(source);

  const getPart = (type: string): string | null =>
    berlinParts.find((p) => p.type === type)?.value ?? null;

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hourStr = getPart("hour");
  const minuteStr = getPart("minute");
  const tzName = getPart("timeZoneName") ?? "Europe/Berlin";

  if (!year || !month || !day || !hourStr || !minuteStr) return null;

  const hourNum = Number.parseInt(hourStr, 10);
  const minuteNum = Number.parseInt(minuteStr, 10);
  const roundedMinute = Math.floor(minuteNum / 30) * 30;
  const paddedMinute = roundedMinute.toString().padStart(2, "0");
  const paddedHour = hourNum.toString().padStart(2, "0");

  return `${day}.${month}.${year}, ${paddedHour}:${paddedMinute} ${tzName}`;
}
