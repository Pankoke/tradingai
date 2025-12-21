"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

type Props = {
  setup: SetupViewModel;
  generatedAtText?: string | null;
  timeframe?: string | null;
  variant?: "full" | "compact";
};

export function SetupCardHeaderBlock({
  setup,
  generatedAtText,
  timeframe,
  variant = "full",
}: Props): JSX.Element {
  const t = useT();
  const meta = getAssetMeta(setup.assetId, setup.symbol);
  const headline = formatAssetLabel(setup.assetId, setup.symbol);
  const isLong = setup.direction === "Long";
  const formattedGeneratedAt = formatGeneratedAt(generatedAtText);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p
          className={`font-semibold uppercase tracking-[0.4em] text-slate-200 ${
            variant === "full" ? "text-sm" : "text-xs"
          }`}
        >
          {t("setups.setupOfTheDay")}
        </p>
        {formattedGeneratedAt ? (
          <p className="text-xs font-semibold text-slate-300 sm:text-right">
            {t("perception.generatedAt.label").replace("{value}", formattedGeneratedAt)}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span>{headline}</span>
          {timeframe ? <span className="text-slate-300"> · {timeframe}</span> : null}
          <span className={`text-slate-300 ${isLong ? "text-emerald-400" : "text-rose-400"}`}> · {setup.direction}</span>
        </h2>
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
