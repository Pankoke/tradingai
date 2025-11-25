"use client";

import type { JSX } from "react";
import { getSetupById } from "@/src/lib/mockSetups";
import { useT } from "@/src/lib/i18n/ClientProvider";

type PageProps = {
  params: { locale: string; id: string };
};

export default function SetupDetailPage({ params }: PageProps): JSX.Element {
  const { id } = params;
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

  return (
    <div className="bg-[#0b0f14] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {setup.symbol} · {setup.timeframe}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                isLong ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
              }`}
            >
              {setup.direction}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold">
              {setup.type}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs">
              Confidence: {setup.confidence}%
            </span>
            <span className="text-xs">{t("detail.header.snapshotLabel")}</span>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                {t("detail.tradeSetupTitle")}
              </h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Level label={t("setups.entry")} value={setup.entryZone} tone="neutral" />
                <Level label={t("setups.stopLoss")} value={setup.stopLoss} tone="danger" />
                <Level label={t("setups.takeProfit")} value={setup.takeProfit} tone="success" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                {t("detail.keyMetricsTitle")}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <MetricRow label={t("setups.event")} value={setup.eventScore} />
                <MetricRow label={t("setups.bias")} value={setup.biasScore} />
                <MetricRow label={t("setups.sentiment")} value={setup.sentimentScore} />
                <MetricRow label={t("setups.balance")} value={setup.balanceScore} />
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs text-slate-300">Confidence</div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#0ea5e9]"
                    style={{ width: `${setup.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                {t("detail.chartTitle")}
              </h2>
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
              Bias: {setup.biasScore}% · Sentiment: {setup.sentimentScore}% · Event: {setup.eventScore}% · Balance:{" "}
              {setup.balanceScore}%.
            </p>
          </TabCard>
          <TabCard title={t("detail.tab.analysis")}>
            <p className="text-sm text-slate-300">
              Hier wird später eine KI-generierte Erklärung des Setups erscheinen, inklusive Markt-Story und
              Begründung der Scores.
            </p>
          </TabCard>
          <TabCard title={t("detail.tab.risk")}>
            <p className="text-sm text-slate-300">
              Geplante Risk-Module zeigen hier künftige Metriken wie R:R, Positionsgrößen oder Szenario-Analysen.
            </p>
          </TabCard>
        </div>
      </div>
    </div>
  );
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
