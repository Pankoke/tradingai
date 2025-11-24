"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

type EventFormState = {
  event: EventOption;
  asset: AssetOption;
  impact: ImpactOption;
  timing: TimingOption;
};

type EventOption =
  | "Zinserhoehung"
  | "Zinsentscheidung"
  | "CPI"
  | "NFP"
  | "Token-News"
  | "On-Chain-Spike"
  | "Earnings";
type AssetOption = "BTCUSD" | "ETHUSD" | "NAS100" | "DAX40" | "GOLD" | "OIL";
type ImpactOption = "Low" | "Medium" | "High";
type TimingOption = "24h" | "now" | "1-7" | "future";

type EventInterpretation = {
  bias: "Bullish" | "Neutral" | "Bearish";
  volatility: "low" | "moderate" | "high";
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  keyFactors: string[];
  explanation: string;
};

export default function EventInterpreterPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;

  const [form, setForm] = useState<EventFormState>({
    event: "Zinserhoehung",
    asset: "BTCUSD",
    impact: "Medium",
    timing: "24h",
  });
  const [result, setResult] = useState<EventInterpretation | null>(null);

  const biasStyle = useMemo(() => {
    if (!result) return "";
    if (result.bias === "Bullish") return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
    if (result.bias === "Bearish") return "text-red-400 border-red-500/50 bg-red-500/10";
    return "text-[var(--text-secondary)] border-[var(--border-subtle)] bg-[var(--bg-main)]";
  }, [result]);

  const handleChange = <K extends keyof EventFormState>(key: K, value: EventFormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = (): void => {
    const generated = generateMockEventInterpretation({
      event: form.event,
      asset: form.asset,
      impact: form.impact,
      timing: form.timing,
      template: t("eventInterpreter.mockExplanation"),
    });
    setResult(generated);
  };

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("eventInterpreter.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("eventInterpreter.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("eventInterpreter.form.event")}
              value={form.event}
              options={["Zinserhoehung", "Zinsentscheidung", "CPI", "NFP", "Token-News", "On-Chain-Spike", "Earnings"]}
              onChange={(value) => handleChange("event", value)}
            />
            <FormField
              label={t("eventInterpreter.form.asset")}
              value={form.asset}
              options={["BTCUSD", "ETHUSD", "NAS100", "DAX40", "GOLD", "OIL"]}
              onChange={(value) => handleChange("asset", value)}
            />
            <FormField
              label={t("eventInterpreter.form.impact")}
              value={form.impact}
              options={["Low", "Medium", "High"]}
              onChange={(value) => handleChange("impact", value)}
            />
            <FormField
              label={t("eventInterpreter.form.timing")}
              value={form.timing}
              options={["24h", "now", "1-7", "future"]}
              onChange={(value) => handleChange("timing", value)}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {t("eventInterpreter.form.generate")}
            </button>
          </div>
        </section>

        {result ? (
          <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{t("eventInterpreter.resultTitle")}</h2>
                <div className="inline-flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${biasStyle}`}>
                    {t("eventInterpreter.bias")}: {result.bias}
                  </span>
                  <SmallGauge label="Confidence" value={result.confidence} />
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {form.event} · {form.asset} · {form.impact} · {form.timing}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBox title={t("eventInterpreter.volatility")} value={result.volatility} />
              <InfoBox title={t("eventInterpreter.riskLevel")} value={result.riskLevel} />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{t("eventInterpreter.keyFactors")}</div>
              <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
                {result.keyFactors.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t("eventInterpreter.explanationTitle")}
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{result.explanation}</p>
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
  event: string;
  asset: string;
  impact: string;
  timing: string;
  template: string;
};

function generateMockEventInterpretation(params: GenerateParams): EventInterpretation {
  const bias = pickBias(params.event);
  const volatility = pickVolatility(params.impact);
  const riskLevel = mapRisk(volatility);
  const confidence = randomInt(50, 90);
  const keyFactors = buildFactors(params.asset, params.event);
  const explanation = `${params.template} "${params.event}" fuer ${params.asset} (Impact ${params.impact}, Timing ${params.timing}).`;

  return {
    bias,
    volatility,
    riskLevel,
    confidence,
    keyFactors,
    explanation,
  };
}

function pickBias(event: string): EventInterpretation["bias"] {
  if (event === "CPI" || event === "Zinserhoehung") return Math.random() > 0.5 ? "Bearish" : "Neutral";
  if (event === "Zinsentscheidung") return Math.random() > 0.5 ? "Bullish" : "Neutral";
  if (event === "Earnings" || event === "Token-News") return Math.random() > 0.4 ? "Bullish" : "Neutral";
  if (event === "On-Chain-Spike") return Math.random() > 0.5 ? "Bullish" : "Bearish";
  return "Neutral";
}

function pickVolatility(impact: string): EventInterpretation["volatility"] {
  if (impact === "High") return Math.random() > 0.2 ? "high" : "moderate";
  if (impact === "Low") return Math.random() > 0.3 ? "low" : "moderate";
  return "moderate";
}

function mapRisk(volatility: EventInterpretation["volatility"]): EventInterpretation["riskLevel"] {
  if (volatility === "high") return "high";
  if (volatility === "moderate") return "medium";
  return "low";
}

function buildFactors(asset: string, event: string): string[] {
  const pool = [
    "Market reacts strongly to macro events",
    "Liquidity conditions shifting",
    "Funding turning negative",
    "Event historically triggers spikes",
    `${asset} shows correlation to rate decisions`,
    `${asset} sensitive to risk-on/off flows`,
  ];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, randomInt(2, 4));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
