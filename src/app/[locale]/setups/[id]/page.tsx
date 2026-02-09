"use client";

import type { JSX } from "react";
import { getSetupById } from "@/src/lib/mockSetups";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatNumberText, formatRangeText } from "@/src/lib/formatters/levels";
import { Badge } from "@/src/components/ui/badge";
import { Tooltip } from "@/src/components/ui/tooltip";
import {
  getPerceptionDataMode,
  getSetupHeaderModeLabelKey,
  resolvePerceptionDataMode,
  type PerceptionDataMode,
} from "@/src/lib/config/perceptionDataMode";
import type { Setup } from "@/src/lib/engine/types";

type PageProps = {
  params: { locale: string; id: string };
};

type HeaderSetupMeta = {
  dataMode?: string | null;
  snapshotTime?: string | null;
  snapshotLabel?: string | null;
  contextLabel?: string | null;
};

export default function SetupDetailPage({ params }: PageProps): JSX.Element {
  const { id, locale } = params;
  const setup = getSetupById(id);
  const t = useT();

  if (!setup) {
    return (
      <div className="bg-[#0b0f14] text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("detail.notFound")}</h1>
        </div>
      </div>
    );
  }

  const isLong = setup.direction === "Long";
  const mode = resolveSetupHeaderDataMode(setup);
  const modeLabel = t(getSetupHeaderModeLabelKey(mode));
  const contextBadges = resolveContextBadges(setup, t);
  const generatedAt = setup.snapshotCreatedAt ?? null;
  const asOf = getAsOfFromSetup(setup);
  const generatedAtLabel = formatHeaderDateTime(generatedAt, locale) ?? t("perception.riskReward.valueNA");
  const asOfLabel = formatHeaderDateTime(asOf, locale) ?? t("perception.riskReward.valueNA");

  return (
    <div className="bg-[#0b0f14] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {setup.symbol} - {setup.timeframe}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <Badge
              variant="outline"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isLong ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
              }`}
            >
              {setup.direction}
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold">
              {setup.type}
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-800 px-3 py-1 text-xs">
              Confidence: {setup.confidence}%
            </Badge>
            <Tooltip content={t("setup.header.timeHelp")}>
              <Badge
                variant="outline"
                className="rounded-full border-cyan-700/70 bg-cyan-900/30 px-3 py-1 text-xs font-semibold text-cyan-200"
              >
                {modeLabel}
              </Badge>
            </Tooltip>
            {contextBadges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="rounded-full border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                {badge}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>
              {t("setup.header.generated")}: {generatedAtLabel}
            </span>
            <span>|</span>
            <span>
              {t("setup.header.asOf")}: {asOfLabel}
            </span>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">{t("detail.tradeSetupTitle")}</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Level label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
                <Level label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
                <Level label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">{t("detail.keyMetricsTitle")}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <MetricRow label={t("setups.event")} value={setup.eventScore} />
                <MetricRow label={t("setups.bias")} value={setup.biasScore} />
                <MetricRow label={t("setups.sentiment")} value={setup.sentimentScore} />
                <MetricRow label={t("setups.balance")} value={setup.balanceScore} />
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs text-slate-300">Confidence</div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-[#0ea5e9]" style={{ width: `${setup.confidence}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">{t("detail.chartTitle")}</h2>
              <div className="mt-3 flex h-64 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                Chart-Preview (Demo)
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TabCard title={t("detail.tab.setup")}>
            <p className="text-sm text-slate-300">
              Dieses Setup fokussiert sich auf klare Entry-Zonen mit definiertem Stop-Loss und Take-Profit. Der Bias
              basiert auf Marktstruktur und Event-Kontext.
            </p>
          </TabCard>
          <TabCard title={t("detail.tab.scores")}>
            <p className="text-sm text-slate-300">
              Bias: {setup.biasScore}% - Sentiment: {setup.sentimentScore}% - Event: {setup.eventScore}% - Balance:{" "}
              {setup.balanceScore}%.
            </p>
          </TabCard>
          <TabCard title={t("detail.tab.analysis")}>
            <p className="text-sm text-slate-300">
              Hier wird spaeter eine KI-generierte Erklaerung des Setups erscheinen, inklusive Markt-Story und
              Begruendung der Scores.
            </p>
          </TabCard>
          <TabCard title={t("detail.tab.risk")}>
            <p className="text-sm text-slate-300">
              Geplante Risk-Module zeigen hier kuenftige Metriken wie R:R, Positionsgroessen oder Szenario-Analysen.
            </p>
          </TabCard>
        </div>
      </div>
    </div>
  );
}

function resolveSetupHeaderDataMode(setup: Setup): PerceptionDataMode {
  const setupMeta = setup as Setup & HeaderSetupMeta;
  return resolvePerceptionDataMode(setupMeta.dataMode ?? getPerceptionDataMode());
}

function getAsOfFromSetup(setup: Setup): string | null {
  const ringAsOf =
    setup.rings.meta.trend.asOf ??
    setup.rings.meta.event.asOf ??
    setup.rings.meta.bias.asOf ??
    setup.rings.meta.sentiment.asOf ??
    setup.rings.meta.orderflow.asOf ??
    setup.rings.meta.confidence.asOf ??
    null;

  if (ringAsOf) {
    return ringAsOf;
  }

  const setupMeta = setup as Setup & HeaderSetupMeta;
  return setupMeta.snapshotTime ?? null;
}

function resolveContextBadges(setup: Setup, t: (key: string) => string): string[] {
  const setupMeta = setup as Setup & HeaderSetupMeta;
  const source = `${setupMeta.snapshotLabel ?? ""} ${setupMeta.contextLabel ?? ""}`.toLowerCase();
  const labels: string[] = [];

  if (source.includes("backtest")) {
    labels.push(t("setup.header.context.backtest"));
  }

  if (source.includes("playback") || source.includes("replay")) {
    labels.push(t("setup.header.context.playback"));
  }

  return labels;
}

function formatHeaderDateTime(input: string | null, locale: string): string | null {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
    hour12: false,
  }).format(parsed);
}

type LevelProps = {
  label: string;
  value: string;
  tone: "neutral" | "danger" | "success";
};

function Level({ label, value, tone }: LevelProps): JSX.Element {
  const color =
    tone === "danger"
      ? "text-rose-400"
      : tone === "success"
        ? "text-emerald-400"
        : "text-slate-100";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: number;
};

function MetricRow({ label, value }: MetricRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
      <span className="text-slate-200">{label}</span>
      <span className="font-semibold text-slate-100">{value}%</span>
    </div>
  );
}

type TabCardProps = {
  title: string;
  children: JSX.Element | JSX.Element[] | string;
};

function TabCard({ title, children }: TabCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
