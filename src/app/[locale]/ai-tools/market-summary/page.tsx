"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

type FormState = {
  asset: AssetOption;
  range: RangeOption;
  mode: ModeOption;
};

type AssetOption = "BTCUSD" | "ETHUSD" | "SOLUSD" | "NAS100" | "DAX40" | "XAUUSD" | "WTI";
type RangeOption = "24h" | "7d" | "30d" | "ytd";
type ModeOption = "global" | "technisch" | "fundamental" | "marktbreit";

type MarketSummaryResult = {
  sentiment: "Bullish" | "Neutral" | "Bearish";
  confidence: number;
  volatility: string;
  trend: string;
  keyEvents: string[];
  summary: string;
};

export default function MarketSummaryPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;

  const [form, setForm] = useState<FormState>({
    asset: "BTCUSD",
    range: "24h",
    mode: "global",
  });
  const [result, setResult] = useState<MarketSummaryResult | null>(null);

  const sentimentStyles = useMemo(() => {
    if (!result) return "";
    if (result.sentiment === "Bullish") return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
    if (result.sentiment === "Bearish") return "text-red-400 border-red-500/50 bg-red-500/10";
    return "text-[var(--text-secondary)] border-[var(--border-subtle)] bg-[var(--bg-main)]";
  }, [result]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = (): void => {
    const generated = generateMockMarketSummary({
      asset: form.asset,
      range: form.range,
      mode: form.mode,
      summaryTemplate: t("marketSummary.mockSummary"),
    });
    setResult(generated);
  };

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("marketSummary.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("marketSummary.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("marketSummary.form.asset")}
              value={form.asset}
              options={["BTCUSD", "ETHUSD", "SOLUSD", "NAS100", "DAX40", "XAUUSD", "WTI"]}
              onChange={(value) => handleChange("asset", value)}
            />
            <FormField
              label={t("marketSummary.form.range")}
              value={form.range}
              options={["24h", "7d", "30d", "ytd"]}
              onChange={(value) => handleChange("range", value)}
            />
            <FormField
              label={t("marketSummary.form.mode")}
              value={form.mode}
              options={["global", "technisch", "fundamental", "marktbreit"]}
              onChange={(value) => handleChange("mode", value)}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {t("marketSummary.form.generate")}
            </button>
          </div>
        </section>

        {result ? (
          <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{t("marketSummary.resultTitle")}</h2>
                <div className="inline-flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${sentimentStyles}`}>
                    {t("marketSummary.sentiment")}: {result.sentiment}
                  </span>
                  <SmallGauge label="Confidence" value={result.confidence} />
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {form.asset} · {form.range} · {form.mode}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBox title={t("marketSummary.trend")} value={result.trend} />
              <InfoBox title={t("marketSummary.volatility")} value={result.volatility} />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                {t("marketSummary.eventsTitle")}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {result.keyEvents.map((event) => (
                  <li key={event} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{t("marketSummary.summaryTitle")}</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{result.summary}</p>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

type FormFieldProps<T extends string> = {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

function FormField<T extends string>({ label, value, options, onChange }: FormFieldProps<T>): JSX.Element {
  return (
    <label className="flex flex-col gap-2 text-sm text-[var(--text-primary)]">
      <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type InfoBoxProps = {
  title: string;
  value: string;
};

function InfoBox({ title, value }: InfoBoxProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{title}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

type SmallGaugeProps = {
  label?: string;
  value: number;
};

function SmallGauge({ label, value }: SmallGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(15,23,42,0.85) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-xs font-semibold text-[var(--text-primary)]">{clamped}%</span>
        </div>
      </div>
      {label ? <span className="text-xs text-[var(--text-secondary)]">{label}</span> : null}
    </div>
  );
}

type GenerateParams = {
  asset: string;
  range: string;
  mode: string;
  summaryTemplate: string;
};

function generateMockMarketSummary(params: GenerateParams): MarketSummaryResult {
  const sentiments: Array<MarketSummaryResult["sentiment"]> = ["Bullish", "Neutral", "Bearish"];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const confidence = randomInt(40, 85);
  const volatilityOptions = ["hoch", "moderat", "niedrig"];
  const trendOptions = ["Aufwaertstrend", "Seitwaertsphase", "Abwaertstrend"];

  const keyEvents = buildEvents(params.asset, params.range);
  const summary = `${params.summaryTemplate} ${params.asset} (${params.range}).`;

  return {
    sentiment,
    confidence,
    volatility: volatilityOptions[Math.floor(Math.random() * volatilityOptions.length)],
    trend: trendOptions[Math.floor(Math.random() * trendOptions.length)],
    keyEvents,
    summary,
  };
}

function buildEvents(asset: string, range: string): string[] {
  const pool = [
    `${asset}: Reaktion auf fruehere Widerstandszone im Zeitraum ${range}`,
    `${asset}: Funding und Open Interest moderat steigend`,
    `${asset}: Macro-Event beeinflusst Risikoaufschlaege`,
    `${asset}: Sentiment laut Futures-Flow stabil`,
    `${asset}: Volatilitaet gedämpft, Range-Bound`,
  ];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, randomInt(2, 4));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
