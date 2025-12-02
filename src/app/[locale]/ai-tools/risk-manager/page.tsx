"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { computeRisk } from "@/features/risk-manager/calc";
import type {
  Direction,
  RiskCalculationResult,
  RiskFormState,
} from "@/features/risk-manager/types";

const DEFAULT_FORM: RiskFormState = {
  asset: "BTCUSDT",
  accountSize: 10000,
  riskPercent: 1,
  entry: 0,
  stopLoss: 0,
  takeProfit: null,
  direction: "long",
  leverage: 1,
};

function parseNumberParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialFormState(searchParams: URLSearchParams): RiskFormState {
  return {
    ...DEFAULT_FORM,
    asset: searchParams.get("asset") ?? DEFAULT_FORM.asset,
    entry: parseNumberParam(searchParams.get("entry")) ?? DEFAULT_FORM.entry,
    stopLoss: parseNumberParam(searchParams.get("stopLoss")) ?? DEFAULT_FORM.stopLoss,
    takeProfit: parseNumberParam(searchParams.get("takeProfit")) ?? DEFAULT_FORM.takeProfit,
  };
}

export default function RiskManagerPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;

  const searchParams = useSearchParams();
  const initialForm = useMemo(() => buildInitialFormState(searchParams), [searchParams]);
  const [form, setForm] = useState<RiskFormState>(initialForm);
  const [result, setResult] = useState<RiskCalculationResult | null>(null);

  const handleTextChange = (value: string): void => {
    setForm((prev) => ({ ...prev, asset: value }));
  };

  const handleNumericChange = (
    key: "accountSize" | "riskPercent" | "entry" | "stopLoss" | "leverage",
    value: string,
  ): void => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setForm((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleTakeProfitChange = (value: string): void => {
    const parsed = Number(value);
    setForm((prev) => ({
      ...prev,
      takeProfit: value.trim() === "" ? null : Number.isFinite(parsed) ? parsed : prev.takeProfit,
    }));
  };

  const handleDirectionChange = (direction: Direction): void => {
    setForm((prev) => ({ ...prev, direction }));
  };

  const handleCalculate = (): void => {
    const stopDistance = Math.abs(form.entry - form.stopLoss);
    if (!isFinite(form.accountSize) || form.accountSize <= 0) return;
    if (!isFinite(form.riskPercent) || form.riskPercent <= 0) return;
    if (!isFinite(stopDistance) || stopDistance <= 0) return;

    const calculation = computeRisk(form);
    setResult(calculation);
  };

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("riskManager.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("riskManager.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <label className="flex flex-col gap-2 text-sm text-[var(--text-primary)]">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Asset
                </span>
                <input
                  type="text"
                  value={form.asset}
                  onChange={(event) => handleTextChange(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>
            </div>
            <NumberField
              label={t("riskManager.form.accountSize")}
              value={formatNumberInput(form.accountSize)}
              onChange={(value) => handleNumericChange("accountSize", value)}
            />
            <NumberField
              label={t("riskManager.form.riskPercent")}
              value={formatNumberInput(form.riskPercent)}
              onChange={(value) => handleNumericChange("riskPercent", value)}
            />
            <NumberField
              label="Entry Preis"
              value={formatNumberInput(form.entry)}
              onChange={(value) => handleNumericChange("entry", value)}
            />
            <NumberField
              label="Stop-Loss Preis"
              value={formatNumberInput(form.stopLoss)}
              onChange={(value) => handleNumericChange("stopLoss", value)}
            />
            <NumberField
              label="Take-Profit (optional)"
              value={formatOptionalNumberInput(form.takeProfit)}
              onChange={handleTakeProfitChange}
            />
            <div className="sm:col-span-2 space-y-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Richtung</span>
              <div className="grid grid-cols-2 gap-2">
                {(["long", "short"] as Direction[]).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => handleDirectionChange(dir)}
                    className={[
                      "rounded-lg border px-2 py-1 text-sm transition",
                      form.direction === dir
                        ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                        : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-black/50",
                    ].join(" ")}
                  >
                    {dir === "long" ? "Long" : "Short"}
                  </button>
                ))}
              </div>
            </div>
            <NumberField
              label={t("riskManager.form.leverage")}
              value={formatNumberInput(form.leverage)}
              onChange={(value) => handleNumericChange("leverage", value)}
              help="optional"
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleCalculate}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {t("riskManager.form.calculate")}
            </button>
          </div>
        </section>

        {result ? (
          <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg">
            <h2 className="text-xl font-semibold tracking-tight">{t("riskManager.result.title")}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("riskManager.result.positionSize")} value={result.positionSize.toFixed(2)} />
              <StatCard label={t("riskManager.result.maxLoss")} value={result.maxLossAmount.toFixed(2)} />
              <StatCard label={t("riskManager.result.riskPercent")} value={`${result.riskPercent.toFixed(2)} %`} />
              <StatCard label={t("riskManager.result.stopDistance")} value={result.stopDistance.toFixed(2)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr,1.2fr]">
              <InfoBox
                title={t("riskManager.result.leverageTitle")}
                value={`x${result.leverage.toFixed(2)}`}
                tone="neutral"
              />
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{t("riskManager.result.hintTitle")}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t("riskManager.result.hintTemplate").replace("{{riskPercent}}", result.riskPercent.toFixed(2))}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-[11px] text-white/70">
              <p>Du riskierst ca. {formatCurrency(result.riskAmount)} auf Basis deines Kontos.</p>
              {result.rewardAmount != null && (
                <p className="mt-1">
                  Potenzial: {formatCurrency(result.rewardAmount)} (RRR:{" "}
                  {(result.riskReward ?? 0).toFixed(2)} : 1)
                </p>
              )}
            </div>

            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-200">
              {t("riskManager.result.warning")}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
};

function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? value.toString() : "";
}

function formatOptionalNumberInput(value: number | null): string {
  return Number.isFinite(value ?? NaN) ? `${value}` : "";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function NumberField({ label, value, onChange, help }: NumberFieldProps): JSX.Element {
  return (
    <label className="flex flex-col gap-2 text-sm text-[var(--text-primary)]">
      <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
      {help ? <span className="text-[0.7rem] text-[var(--text-secondary)]">{help}</span> : null}
    </label>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm">
      <span className="text-[0.75rem] uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
      <span className="text-base font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

type InfoBoxProps = {
  title: string;
  value: string;
  tone?: "neutral";
};

function InfoBox({ title, value }: InfoBoxProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{title}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

