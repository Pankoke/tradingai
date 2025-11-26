"use client";

import React, { useState } from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type RiskFormState = {
  accountSize: string;
  riskPercent: string;
  stopDistance: string;
  leverage: string;
};

type RiskCalculationResult = {
  positionSize: number;
  maxLossAmount: number;
  riskPercent: number;
  stopDistance: number;
  leverage: number;
  rrHint: string;
};

export default function RiskManagerPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";
  const [form, setForm] = useState<RiskFormState>({
    accountSize: "",
    riskPercent: "",
    stopDistance: "",
    leverage: "",
  });
  const [result, setResult] = useState<RiskCalculationResult | null>(null);

  const handleChange = (key: keyof RiskFormState, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = (): void => {
    const accountSize = parseFloat(form.accountSize);
    const riskPercent = parseFloat(form.riskPercent);
    const stopDistance = parseFloat(form.stopDistance);
    const leverage = form.leverage.trim() === "" ? undefined : parseFloat(form.leverage);

    if (!isFinite(accountSize) || accountSize <= 0) return;
    if (!isFinite(riskPercent) || riskPercent <= 0) return;
    if (!isFinite(stopDistance) || stopDistance <= 0) return;

    const calculation = calculateRisk({ accountSize, riskPercent, stopDistance, leverage });
    setResult(calculation);
  };

  if (!isPro) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="aiTools" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("riskManager.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("riskManager.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={t("riskManager.form.accountSize")}
              value={form.accountSize}
              onChange={(value) => handleChange("accountSize", value)}
            />
            <NumberField
              label={t("riskManager.form.riskPercent")}
              value={form.riskPercent}
              onChange={(value) => handleChange("riskPercent", value)}
            />
            <NumberField
              label={t("riskManager.form.stopDistance")}
              value={form.stopDistance}
              onChange={(value) => handleChange("stopDistance", value)}
              help="(Punkte / $ / € je nach Markt)"
            />
            <NumberField
              label={t("riskManager.form.leverage")}
              value={form.leverage}
              onChange={(value) => handleChange("leverage", value)}
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

type CalcParams = {
  accountSize: number;
  riskPercent: number;
  stopDistance: number;
  leverage?: number;
};

function calculateRisk(params: CalcParams): RiskCalculationResult {
  const leverage = params.leverage && isFinite(params.leverage) && params.leverage > 0 ? params.leverage : 1;
  const maxLossAmount = params.accountSize * (params.riskPercent / 100);
  const positionSize = (maxLossAmount / params.stopDistance) * leverage;
  const rrHint = buildHint(params.riskPercent, params.stopDistance);

  return {
    positionSize,
    maxLossAmount,
    riskPercent: params.riskPercent,
    stopDistance: params.stopDistance,
    leverage,
    rrHint,
  };
}

function buildHint(riskPercent: number, stopDistance: number): string {
  if (riskPercent <= 0 || stopDistance <= 0) return "";
  if (riskPercent <= 1 && stopDistance <= 1) return "konservativ";
  if (riskPercent <= 2 && stopDistance <= 2) return "moderat";
  return "aggressiv";
}
