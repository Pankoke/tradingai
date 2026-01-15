"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { Tooltip } from "@/src/components/ui/tooltip";
import { getPlaybookLabel, resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import { watchEnabledPlaybookIds, tradeRequirementsByPlaybook } from "@/src/lib/config/watchDecision";

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
  const meta = getAssetMeta(setup.assetId, setup.symbol, {
    profile,
    timeframe: timeframe ?? setup.meta.timeframeUsed ?? setup.timeframe,
    snapshotLabel: setup.meta.snapshotLabel ?? null,
    providerSymbolUsed: setup.meta.providerSymbolUsed ?? null,
    dataSourceUsed: setup.meta.dataSourceUsed ?? null,
  });
  const headline = formatAssetLabel(setup.assetId, setup.symbol, {
    profile,
    timeframe: timeframe ?? setup.meta.timeframeUsed ?? setup.timeframe,
    snapshotLabel: setup.meta.snapshotLabel ?? null,
    providerSymbolUsed: setup.meta.providerSymbolUsed ?? null,
    dataSourceUsed: setup.meta.dataSourceUsed ?? null,
  });
  const directionLower = setup.direction?.toLowerCase();
  const directionClass =
    directionLower === "long" ? "text-emerald-400" : directionLower === "short" ? "text-rose-400" : "text-slate-300";
  const formattedGeneratedAt = formatGeneratedAt(generatedAtText);
  const profileChipLabel = buildProfileChipLabel(profile, timeframe);
  const playbookLabel = buildPlaybookLabel(setup);
  const decisionChip = buildDecisionChip(setup);
  const sourceLine = buildSourceLine(setup);
  const decisionLine = buildDecisionLine(setup);
  const requirementsLine = buildRequirementsLine(setup);

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
          <span className={directionClass}> • {setup.direction}</span>
        </h2>
        {profileChipLabel || decisionChip || playbookLabel ? (
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
            {decisionChip}
          </div>
        ) : null}
        {renderDebugLine(setup)}
        <p className="text-sm text-slate-400">{meta.name}</p>
        {decisionLine}
        {requirementsLine}
        {sourceLine ? <p className="text-xs text-slate-400">{sourceLine}</p> : null}
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

function buildDecisionChip(setup: SetupViewModel): JSX.Element | null {
  const decision = setup.setupDecision ?? null;
  const grade = setup.setupGrade ?? null;
  if (!decision && !grade) return null;

  const rationaleLines = setup.decisionReasons ?? setup.gradeRationale ?? [];
  const noTrade = setup.noTradeReason;
  const gradeLabel = grade && grade !== "NO_TRADE" ? grade : grade === "NO_TRADE" ? "NO_TRADE" : null;

  let tone = "border-slate-600 bg-slate-800/80 text-slate-200";
  let label = "NO TRADE";
  if (decision === "TRADE") {
    if (grade === "A") {
      tone = "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
      label = "A";
    } else if (grade === "B") {
      tone = "border-amber-500/60 bg-amber-500/15 text-amber-100";
      label = "B";
    } else {
      tone = "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
      label = "TRADE";
    }
  } else if (decision === "WATCH") {
    tone = "border-amber-400/60 bg-amber-400/10 text-amber-100";
    label = "WATCH";
  } else if (decision === "BLOCKED") {
    tone = "border-rose-500/60 bg-rose-500/10 text-rose-100";
    label = "BLOCKED";
  }

  const tooltipContent =
    rationaleLines.length || noTrade ? (
      <div className="space-y-2">
        {gradeLabel ? <p className="text-xs text-slate-300">Playbook-Grade: {gradeLabel}</p> : null}
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
      "Setup-Entscheidung"
    );

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

function buildSourceLine(setup: SetupViewModel): string | null {
  const primary = setup.meta.dataSourcePrimary ?? null;
  const used = setup.meta.dataSourceUsed ?? primary;
  const providerSymbol = setup.meta.providerSymbolUsed ?? setup.symbol ?? setup.assetId ?? null;
  const timeframe = setup.meta.timeframeUsed ?? setup.timeframe ?? null;

  if (!used && !providerSymbol && !timeframe) return null;

  const formatProvider = (value: string | null) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : null;

  const usedLabel = formatProvider(used);
  const primaryLabel = formatProvider(primary);
  const parts: string[] = [];

  if (usedLabel && primaryLabel && usedLabel !== primaryLabel) {
    parts.push(`Source: ${usedLabel} (fallback from ${primaryLabel})`);
  } else if (usedLabel || primaryLabel) {
    parts.push(`Source: ${usedLabel ?? primaryLabel}`);
  }

  if (providerSymbol) {
    parts.push(providerSymbol);
  }
  if (timeframe) {
    parts.push(timeframe.toUpperCase());
  }

  return parts.length ? parts.join(" · ") : null;
}

function buildDecisionLine(setup: SetupViewModel): JSX.Element | null {
  if (!setup.setupDecision || setup.setupDecision === "TRADE") return null;
  const reasons = (setup.decisionReasons ?? []).slice(0, 2);
  if (!reasons.length) return null;
  const tone = setup.setupDecision === "WATCH" ? "text-amber-200" : "text-rose-200";
  return <p className={`text-xs ${tone}`}>{reasons.slice(0, 2).join(" • ")}</p>;
}

function buildRequirementsLine(setup: SetupViewModel): JSX.Element | null {
  if (setup.setupDecision !== "WATCH") return null;
  const playbookId = (setup.setupPlaybookId ?? "").toLowerCase();
  if (!watchEnabledPlaybookIds.has(playbookId)) return null;
  const requirements = tradeRequirementsByPlaybook[playbookId] ?? [];
  if (!requirements.length) return null;
  return (
    <p className="text-xs text-slate-300">
      Für TRADE nötig: {requirements.slice(0, 3).join(" · ")}
    </p>
  );
}
