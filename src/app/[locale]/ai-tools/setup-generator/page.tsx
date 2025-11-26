"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

type Direction = "Long" | "Short";

type FormState = {
  asset: AssetOption;
  timeframe: TimeframeOption;
  risk: RiskOption;
  type: SetupTypeOption;
};

type GeneratedSetup = {
  symbol: string;
  timeframe: string;
  direction: Direction;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  confidence: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  balanceScore: number;
  explanation: string;
};

type AssetOption = "BTCUSD" | "ETHUSD" | "NAS100" | "DAX40" | "XAUUSD" | "WTI";
type TimeframeOption = "M15" | "M30" | "H1" | "H4" | "D1";
type RiskOption = "konservativ" | "moderat" | "aggressiv";
type SetupTypeOption = "regelbasiert" | "KI" | "hybrid";

export default function SetupGeneratorPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";
  const [form, setForm] = useState<FormState>({
    asset: "BTCUSD",
    timeframe: "H1",
    risk: "moderat",
    type: "regelbasiert",
  });
  const [result, setResult] = useState<GeneratedSetup | null>(null);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = (): void => {
    const generated = generateMockSetup({
      asset: form.asset,
      timeframe: form.timeframe,
      risk: form.risk,
      type: form.type,
      explain: t("setupGenerator.mockExplanation"),
    });
    setResult(generated);
  };

  const directionColor = useMemo(
    () =>
      result?.direction === "Long"
        ? "text-emerald-400 border-emerald-400/50 bg-emerald-500/10"
        : "text-red-400 border-red-400/50 bg-red-500/10",
    [result?.direction],
  );

  if (!isPro) {
    return (
      <AppShell section="aiTools">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="aiTools" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell section="aiTools">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("setupGenerator.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("setupGenerator.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("setupGenerator.form.asset")}
              value={form.asset}
              onChange={(value) => handleChange("asset", value)}
              options={["BTCUSD", "ETHUSD", "NAS100", "DAX40", "XAUUSD", "WTI"]}
            />
            <FormField
              label={t("setupGenerator.form.timeframe")}
              value={form.timeframe}
              onChange={(value) => handleChange("timeframe", value)}
              options={["M15", "M30", "H1", "H4", "D1"]}
            />
            <FormField
              label={t("setupGenerator.form.risk")}
              value={form.risk}
              onChange={(value) => handleChange("risk", value)}
              options={["konservativ", "moderat", "aggressiv"]}
            />
            <FormField
              label={t("setupGenerator.form.type")}
              value={form.type}
              onChange={(value) => handleChange("type", value)}
              options={["regelbasiert", "KI", "hybrid"]}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {t("setupGenerator.form.generate")}
            </button>
          </div>
        </section>

        {result ? (
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg space-y-5">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("setupGenerator.resultTitle")}: {result.symbol} · {result.timeframe}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className={`rounded-full border px-3 py-1 font-semibold ${directionColor}`}>
                    {result.direction}
                  </span>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 font-semibold text-[var(--text-primary)]">
                    {form.type}
                  </span>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1">
                    Confidence: {result.confidence}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SmallGauge label="Confidence" value={result.confidence} />
              </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              <GaugeCard label={t("setups.event")} value={result.eventScore} />
              <GaugeCard label={t("setups.bias")} value={result.biasScore} />
              <GaugeCard label={t("setups.sentiment")} value={result.sentimentScore} />
              <GaugeCard label={t("setups.balance")} value={result.balanceScore} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <LevelBox label={t("setups.entry")} value={result.entryZone} tone="neutral" />
              <LevelBox label={t("setups.stopLoss")} value={result.stopLoss} tone="danger" />
              <LevelBox label={t("setups.takeProfit")} value={result.takeProfit} tone="success" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("setupGenerator.explanationTitle")}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{result.explanation}</p>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
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

type GaugeCardProps = {
  label: string;
  value: number;
};

function GaugeCard({ label, value }: GaugeCardProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <SmallGauge value={value} />
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

type LevelTone = "neutral" | "danger" | "success";

type LevelBoxProps = {
  label: string;
  value: string;
  tone: LevelTone;
};

function LevelBox({ label, value, tone }: LevelBoxProps): JSX.Element {
  const color =
    tone === "danger"
      ? "text-red-400"
      : tone === "success"
        ? "text-emerald-400"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-3">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

type GenerateParams = {
  asset: string;
  timeframe: string;
  risk: string;
  type: string;
  explain: string;
};

function generateMockSetup(params: GenerateParams): GeneratedSetup {
  const direction: Direction = Math.random() > 0.5 ? "Long" : "Short";
  const confidence = randomInt(55, 88);
  const eventScore = randomInt(40, 90);
  const biasScore = randomInt(40, 90);
  const sentimentScore = randomInt(40, 90);
  const balanceScore = randomInt(40, 90);

  const base = randomInt(50, 150);
  const entryZone = `${(base - 0.6).toFixed(1)} – ${(base + 0.6).toFixed(1)}`;
  const stopLoss = (base - 1.4).toFixed(1);
  const takeProfit = (base + 2.1).toFixed(1);

  const explanation = `${params.explain} ${params.asset} ${params.timeframe}.`;

  return {
    symbol: params.asset,
    timeframe: params.timeframe,
    direction,
    entryZone,
    stopLoss,
    takeProfit,
    confidence,
    eventScore,
    biasScore,
    sentimentScore,
    balanceScore,
    explanation,
  };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
