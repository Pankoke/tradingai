"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { Tooltip } from "@/src/components/ui/tooltip";
import { getPlaybookLabel, resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";

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
  const profileChipLabel = buildProfileChipLabel(profile, timeframe);
  const playbookLabel = buildPlaybookLabel(setup);
  const gradeChip = buildGradeChip(setup);

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
        {profileChipLabel || gradeChip || playbookLabel ? (
          <div className="flex flex-wrap gap-2">
            {profileChipLabel ? (
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-200">
                {profileChipLabel}
              </span>
            ) : null}
            {playbookLabel ? (
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {playbookLabel}
              </span>
            ) : null}
            {gradeChip}
          </div>
        ) : null}
        {renderDebugLine(setup)}
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

function buildGradeChip(setup: SetupViewModel): JSX.Element | null {
  const grade = setup.setupGrade;
  if (!grade) return null;
  const tone =
    grade === "A"
      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
      : grade === "B"
        ? "border-amber-500/60 bg-amber-500/15 text-amber-100"
        : "border-slate-600 bg-slate-800/80 text-slate-200";

  const rationaleLines = setup.gradeRationale?.filter(Boolean) ?? [];
  const noTrade = setup.noTradeReason;
  const tooltipContent =
    rationaleLines.length || noTrade ? (
      <div className="space-y-2">
        {rationaleLines.length ? (
          <ul className="list-disc space-y-1 pl-4">
            {rationaleLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {noTrade ? <p className="text-amber-200">No-trade Grund: {noTrade}</p> : null}
      </div>
    ) : (
      "Setup-Grade"
    );

  const label = grade === "NO_TRADE" ? "NO TRADE" : grade;
  const chip = (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {label}
    </span>
  );

  return <Tooltip content={tooltipContent}>{chip}</Tooltip>;
}

function buildPlaybookLabel(setup: SetupViewModel): string | null {
  const profile = (setup.profile ?? "").toUpperCase();
  if (!profile.includes("SWING")) return null;
  const label = getPlaybookLabel(setup.setupPlaybookId ?? undefined, "de");
  return label;
}

export function buildProfileChipLabel(profile?: string | null, timeframe?: string | null): string | null {
  const parts: string[] = [];
  if (profile) parts.push(profile);
  if (timeframe) parts.push(timeframe.toUpperCase());
  return parts.length ? parts.join(" · ") : null;
}

function renderDebugLine(setup: SetupViewModel): JSX.Element | null {
  if (process.env.NEXT_PUBLIC_PLAYBOOK_DEBUG !== "1") return null;
  const resolved = resolvePlaybookWithReason(
    { id: setup.assetId, symbol: setup.symbol, name: null },
    setup.profile ?? null,
  );
  const grade = setup.setupGrade ?? "none";
  return (
    <p className="text-[11px] font-mono text-slate-400">
      Playbook: {resolved.playbook.id} Grade: {grade} ({resolved.reason})
    </p>
  );
}
