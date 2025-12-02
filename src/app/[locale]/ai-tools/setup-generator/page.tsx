"use client";

import { useState } from "react";
import {
  Direction,
  DirectionMode,
  FormState,
  GeneratedSetup,
  RiskProfile,
  Timeframe,
} from "@/src/features/setup-generator/types";
import { fetchSetupGenerator } from "@/src/features/setup-generator/useSetupGenerator";

const INITIAL_FORM: FormState = {
  asset: "BTCUSDT",
  timeframe: "1h",
  riskProfile: "moderate",
  directionMode: "auto",
};

export default function SetupGeneratorPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<GeneratedSetup | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setResult(null);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const setup = await fetchSetupGenerator(form);
      setResult(setup);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isGenerateDisabled =
    !form.asset || !form.timeframe || !form.riskProfile || isLoading;

  return (
    <div className="min-h-screen w-full px-4 py-8 text-sm text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header / Hero */}
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            KI-Tool · Setup Generator
          </div>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Setup Generator
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/70">
                Erzeuge regelbasierte Beispiel-Setups auf Basis von Asset,
                Timeframe und Risikoprofil. Die Daten sind aktuell noch ein
                Mock, dienen aber als UX-Vorlage für die spätere Engine.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
              Powered by Perception · Mock Mode
            </span>
          </div>
        </header>

        {/* Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Linke Spalte – Einstellungen */}
          <section className="space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/40">
              <h2 className="text-sm font-medium">Einstellungen</h2>
              <p className="mt-1 text-xs text-white/60">
                Wähle Asset, Timeframe und Risikoprofil für dein Beispiel-Setup.
              </p>

              <div className="mt-4 space-y-4">
                {/* Asset */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">
                    Asset
                  </label>
                  <select
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs outline-none ring-0 transition focus:border-indigo-400 focus:bg-black/60"
                    value={form.asset}
                    onChange={(e) => handleChange("asset", e.target.value)}
                  >
                    <option value="BTCUSDT">BTC / USDT</option>
                    <option value="ETHUSDT">ETH / USDT</option>
                    <option value="SOLUSDT">SOL / USDT</option>
                    <option value="XRPUSDT">XRP / USDT</option>
                  </select>
                </div>

                {/* Timeframe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">
                    Timeframe
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {(["15m", "1h", "4h", "1d"] as Timeframe[]).map((tf) => {
                      const isActive = form.timeframe === tf;
                      return (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => handleChange("timeframe", tf)}
                          className={[
                            "rounded-lg border px-2 py-1 transition",
                            isActive
                              ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                              : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-black/50",
                          ].join(" ")}
                        >
                          {tf.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Risikoprofil */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">
                    Risikoprofil
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {([
                      "conservative",
                      "moderate",
                      "aggressive",
                    ] as RiskProfile[]).map((profile) => {
                      const isActive = form.riskProfile === profile;
                      const label =
                        profile === "conservative"
                          ? "Konservativ"
                          : profile === "moderate"
                            ? "Moderat"
                            : "Aggressiv";
                      return (
                        <button
                          key={profile}
                          type="button"
                          onClick={() => handleChange("riskProfile", profile)}
                          className={[
                            "rounded-lg border px-2 py-1 transition",
                            isActive
                              ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                              : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-black/50",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Richtung */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">
                    Richtung
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(["auto", "long", "short"] as DirectionMode[]).map(
                      (mode) => {
                        const isActive = form.directionMode === mode;
                        const label =
                          mode === "auto"
                            ? "Auto"
                            : mode === "long"
                              ? "Long"
                              : "Short";

                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => handleChange("directionMode", mode)}
                            className={[
                              "rounded-lg border px-2 py-1 transition",
                              isActive
                                ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                                : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-black/50",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-xs font-medium transition",
                    isGenerateDisabled
                      ? "cursor-not-allowed bg-indigo-500/30 text-indigo-100/50"
                      : "bg-indigo-500 text-white hover:bg-indigo-400",
                  ].join(" ")}
                >
                  {isLoading ? "Berechne Setup…" : "Setup generieren"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/70 transition hover:border-white/40 hover:bg-black/60"
                >
                  Zurücksetzen
                </button>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-white/40">
                Hinweis: Dies ist aktuell nur ein Beispiel-Setup im Mock-Modus
                und keine Finanzberatung. Später wird hier die echte
                Perception-Engine angebunden.
              </p>
            </div>
          </section>

          {/* Mittlere Spalte – Setup-Card */}
          <section className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 via-black/40 to-black/80 p-4 shadow-xl shadow-black/60">
              <h2 className="text-sm font-medium">Vorgeschlagenes Setup</h2>

              {/* Zustände */}
              {!result && !isLoading && (
                <div className="mt-6 flex h-full flex-col items-center justify-center gap-3 text-center text-xs text-white/60">
                  <div className="flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40">
                      <span className="text-lg">⚙️</span>
                    </div>
                  </div>
                  <p className="max-w-xs">
                    Wähle links Asset, Timeframe und Risikoprofil und klicke auf
                    <span className="mx-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                      Setup generieren
                    </span>
                    , um ein Beispiel-Setup zu sehen.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="mt-6 space-y-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/15" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                      <div className="h-8 w-full animate-pulse rounded bg-white/10" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                      <div className="h-8 w-full animate-pulse rounded bg-white/10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  </div>
                </div>
              )}

              {result && !isLoading && (
                <div className="mt-4 space-y-5 text-xs">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatAssetLabel(result.asset)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                          {result.timeframe.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-white/60">
                        Regelbasiertes Beispiel-Setup im{" "}
                        {result.timeframe.toUpperCase()}-Chart.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          result.direction === "long"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-rose-500/20 text-rose-200",
                        ].join(" ")}
                      >
                        {result.direction === "long" ? "Long" : "Short"}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                        Gültig bis{" "}
                        {result.validUntil.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Preislevels */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <LevelBox
                      label="Entry-Zone"
                      value={`${formatPrice(result.entryMin)} – ${formatPrice(
                        result.entryMax,
                      )}`}
                      hint="Limit- oder Zonen-Entry"
                    />
                    <LevelBox
                      label="Stop-Loss"
                      value={formatPrice(result.stopLoss)}
                      hint="Risiko begrenzen"
                    />
                    <LevelBox
                      label="Take-Profit 1 / 2"
                      value={`${formatPrice(result.takeProfit1)} / ${formatPrice(
                        result.takeProfit2,
                      )}`}
                      hint="Teilgewinn sichern"
                    />
                  </div>

                  {/* RRR & Volatilität */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <GaugeCard
                      label="RRR"
                      value={`${result.riskReward.toFixed(2)} : 1`}
                      detail={`Risiko ${formatPercent(
                        result.riskPct,
                      )} · Potenzial ${formatPercent(result.potentialPct)}`}
                    />
                    <GaugeCard
                      label="Volatilität"
                      value={volatilityLabelToText(result.volatilityLabel)}
                      detail={`Confidence ${(result.confidence * 100).toFixed(0)} %`}
                    />
                    <GaugeCard
                      label="Bias & Sentiment"
                      value={describeBias(result.biasScore, result.sentimentScore)}
                      detail={`Bias ${result.biasScore.toFixed(
                        0,
                      )} · Sentiment ${result.sentimentScore.toFixed(0)}`}
                    />
                  </div>

                  {/* Kontextbeschreibung */}
                  <div className="rounded-xl bg-black/40 p-3 text-[11px] text-white/70">
                    {result.contextSummary}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Rechte Spalte – Kontext & Risiko */}
          <section className="space-y-4 lg:col-span-4">
            {/* Markt-Kontext */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-lg shadow-black/40">
              <h2 className="text-sm font-medium">Markt-Kontext</h2>
              <p className="mt-1 text-xs text-white/60">
                Grobe Einordnung des Marktes auf Basis der aktuellen
                Beispiel-Scores. Später wird dieser Bereich direkt mit der
                Perception-Engine verknüpft.
              </p>

              {!result && (
                <p className="mt-4 text-[11px] text-white/50">
                  Noch kein Setup generiert. Sobald ein Setup vorliegt, zeige ich
                  hier eine kurze Zusammenfassung von Event-Risiko, Bias und
                  Sentiment an.
                </p>
              )}

              {result && (
                <div className="mt-4 space-y-2 text-[11px] text-white/70">
                  <p>
                    <span className="font-semibold text-white">
                      Event-Risiko:
                    </span>{" "}
                    {describeEventRisk(result.eventScore)} – Score{" "}
                    {result.eventScore.toFixed(0)} / 100.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      Marktverhalten:
                    </span>{" "}
                    {describeMarketBalance(result.balanceScore)}
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      Zusammenfassung:
                    </span>{" "}
                    {shortContextSummary(result)}
                  </p>
                </div>
              )}
            </div>

            {/* Risiko & Hinweise */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-lg shadow-black/40">
              <h2 className="text-sm font-medium">Risiko & Hinweise</h2>
              <p className="mt-1 text-xs text-white/60">
                Qualitative Hinweise zum Beispiel-Setup. Diese Logik ist bewusst
                konservativ gehalten.
              </p>

              {!result && (
                <ul className="mt-4 list-disc space-y-1 pl-4 text-[11px] text-white/50">
                  <li>Noch kein Setup vorhanden – Risiko-Einschätzung folgt.</li>
                  <li>
                    Später kannst du hier erkennen, ob das Setup zu deinem
                    Risiko-Profil passt.
                  </li>
                </ul>
              )}

              {result && (
                <ul className="mt-4 list-disc space-y-1 pl-4 text-[11px] text-white/70">
                  <li>
                    RRR: <strong>{result.riskReward.toFixed(2)} : 1</strong> –{" "}
                    {result.riskReward >= 2
                      ? "attraktives Chance-Risiko-Verhältnis."
                      : "eher knappes Chance-Risiko-Verhältnis."}
                  </li>
                  <li>
                    Max. Risiko:{" "}
                    <strong>{formatPercent(result.riskPct)}</strong> vom Konto
                    im Beispiel.
                  </li>
                  <li>
                    Volatilität wird als{" "}
                    <strong>
                      {volatilityLabelToText(result.volatilityLabel)}
                    </strong>{" "}
                    eingeschätzt – entsprechend kann der Stop-Loss schwanken.
                  </li>
                  <li>
                    Bias und Sentiment sind{" "}
                    <strong>
                      {describeBiasTendency(
                        result.biasScore,
                        result.sentimentScore,
                      )}
                    </strong>
                    , was die Richtung des Setups{" "}
                    {result.biasScore >= 55 ? "unterstützt." : "nur bedingt stützt."}
                  </li>
                </ul>
              )}

              <p className="mt-3 text-[10px] leading-relaxed text-white/40">
                Später kannst du diesen Bereich direkt mit einem Risk Manager
                verknüpfen und echte Positionsgrößen auf Basis deines Accounts
                berechnen.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Helper & Mock ----------------------------- */
/* eslint-disable @typescript-eslint/no-unused-vars */

function generateMockSetup(form: FormState): GeneratedSetup {
  const basePrice = mockBasePrice(form.asset);
  const direction: Direction =
    form.directionMode === "auto" ? mockDirection() : form.directionMode;

  const volatilityLabel = mockVolatilityLabel();
  const entryWidthFactor =
    volatilityLabel === "high" ? 0.015 : volatilityLabel === "medium" ? 0.01 : 0.006;

  const entryCenter = basePrice * (1 + (direction === "long" ? -0.003 : 0.003));
  const entryMin = entryCenter * (1 - entryWidthFactor);
  const entryMax = entryCenter * (1 + entryWidthFactor);

  const stopDistanceFactor =
    volatilityLabel === "high" ? 0.025 : volatilityLabel === "medium" ? 0.018 : 0.012;

  const stopLoss =
    direction === "long"
      ? entryMin * (1 - stopDistanceFactor)
      : entryMax * (1 + stopDistanceFactor);

  const rrr = mockRrr(form.riskProfile);
  const riskPct = mockRiskPct(form.riskProfile);
  const potentialPct = riskPct * rrr;

  const takeProfit1 =
    direction === "long"
      ? entryMax * (1 + potentialPct * 0.6)
      : entryMin * (1 - potentialPct * 0.6);

  const takeProfit2 =
    direction === "long"
      ? entryMax * (1 + potentialPct)
      : entryMin * (1 - potentialPct);

  const confidence = randomInRange(0.55, 0.9);
  const biasScore = randomInRange(50, 85);
  const sentimentScore = randomInRange(40, 80);
  const eventScore = randomInRange(20, 80);
  const balanceScore = randomInRange(30, 80);

  const validUntil = new Date(Date.now() + mockValidForMs(form.timeframe));

  return {
    id: `mock-${Date.now()}`,
    asset: form.asset,
    timeframe: form.timeframe,
    direction,
    entryMin,
    entryMax,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskReward: rrr,
    riskPct,
    potentialPct,
    volatilityLabel,
    confidence,
    biasScore,
    sentimentScore,
    eventScore,
    balanceScore,
    validUntil,
    contextSummary: buildContextSummary({
      timeframe: form.timeframe,
      direction,
      biasScore,
      sentimentScore,
      volatilityLabel,
    }),
  };
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mockBasePrice(asset: string): number {
  switch (asset) {
    case "BTCUSDT":
      return randomInRange(60000, 70000);
    case "ETHUSDT":
      return randomInRange(3000, 4500);
    case "SOLUSDT":
      return randomInRange(120, 220);
    case "XRPUSDT":
      return randomInRange(0.5, 1.2);
    default:
      return randomInRange(100, 1000);
  }
}

function mockDirection(): Direction {
  return Math.random() > 0.5 ? "long" : "short";
}

function mockVolatilityLabel(): "low" | "medium" | "high" {
  const r = Math.random();
  if (r < 0.2) return "low";
  if (r < 0.7) return "medium";
  return "high";
}

function mockRrr(riskProfile: RiskProfile): number {
  if (riskProfile === "conservative") {
    return randomInRange(1.6, 2.2);
  }
  if (riskProfile === "moderate") {
    return randomInRange(2.0, 2.8);
  }
  return randomInRange(2.5, 3.5);
}

function mockRiskPct(riskProfile: RiskProfile): number {
  if (riskProfile === "conservative") return randomInRange(0.3, 0.7);
  if (riskProfile === "moderate") return randomInRange(0.7, 1.2);
  return randomInRange(1.0, 1.8);
}

function mockValidForMs(timeframe: Timeframe): number {
  switch (timeframe) {
    case "15m":
      return 2 * 60 * 60 * 1000; // 2h
    case "1h":
      return 6 * 60 * 60 * 1000; // 6h
    case "4h":
      return 12 * 60 * 60 * 1000; // 12h
    case "1d":
      return 24 * 60 * 60 * 1000; // 24h
    default:
      return 6 * 60 * 60 * 1000;
  }
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatAssetLabel(asset: string): string {
  if (asset === "BTCUSDT") return "Bitcoin · BTC/USDT";
  if (asset === "ETHUSDT") return "Ethereum · ETH/USDT";
  if (asset === "SOLUSDT") return "Solana · SOL/USDT";
  if (asset === "XRPUSDT") return "XRP · XRP/USDT";
  return asset;
}

function volatilityLabelToText(
  label: "low" | "medium" | "high",
): string {
  if (label === "low") return "Niedrig";
  if (label === "medium") return "Mittel";
  return "Hoch";
}

function describeBias(biasScore: number, sentimentScore: number): string {
  const avg = (biasScore + sentimentScore) / 2;
  if (avg >= 70) return "stark unterstützend";
  if (avg >= 55) return "leicht unterstützend";
  if (avg >= 45) return "neutral";
  return "gegenläufig";
}

function describeBiasTendency(
  biasScore: number,
  sentimentScore: number,
): string {
  const avg = (biasScore + sentimentScore) / 2;
  if (avg >= 70) return "klar unterstützend";
  if (avg >= 55) return "leicht unterstützend";
  if (avg >= 45) return "eher neutral";
  return "eher dagegen";
}

function describeEventRisk(eventScore: number): string {
  if (eventScore >= 70) return "hoch";
  if (eventScore >= 45) return "moderat";
  return "gering";
}

function describeMarketBalance(balanceScore: number): string {
  if (balanceScore >= 70) return "Trend dominiert, wenig Mean-Reversion.";
  if (balanceScore >= 50)
    return "Solider Trend mit Zwischenphasen – beides möglich.";
  if (balanceScore >= 35)
    return "Mehr Range-/Mean-Reversion-Anteile, Trend-Signale mit Vorsicht.";
  return "Überwiegend Range, Trend-Signale sind eher schwach.";
}

function shortContextSummary(setup: GeneratedSetup): string {
  const directionTxt = setup.direction === "long" ? "bullish" : "bearish";
  const volTxt = volatilityLabelToText(setup.volatilityLabel).toLowerCase();
  const rrrTxt =
    setup.riskReward >= 2.2
      ? "attraktives RRR"
      : setup.riskReward >= 1.8
        ? "solides RRR"
        : "etwas knapperes RRR";

  return `Das Setup ist ${directionTxt} mit ${volTxt}er Volatilität und einem ${rrrTxt}. Event-Risiko und Sentiment werden im Beispiel bereits einbezogen, sollten aber immer mit deinem eigenen Plan abgeglichen werden.`;
}

function buildContextSummary(params: {
  timeframe: Timeframe;
  direction: Direction;
  biasScore: number;
  sentimentScore: number;
  volatilityLabel: "low" | "medium" | "high";
}): string {
  const directionText = params.direction === "long" ? "bullish" : "bearish";
  const volText = volatilityLabelToText(params.volatilityLabel).toLowerCase();
  const avgScore = (params.biasScore + params.sentimentScore) / 2;

  const supportText =
    avgScore >= 70
      ? "stark durch Bias und Sentiment unterstützt"
      : avgScore >= 55
        ? "solide durch Bias und Sentiment unterstützt"
        : avgScore >= 45
          ? "nur teilweise unterstützt"
          : "eher gegen den aktuellen Bias gerichtet";

  const timeframeText =
    params.timeframe === "15m"
      ? "Intraday-Skalierung"
      : params.timeframe === "1h"
        ? "intraday-swing-orientiert"
        : params.timeframe === "4h"
          ? "swing-orientiert"
          : "im höheren Timeframe verankert";

  return `Das Setup ist ${directionText}, ${timeframeText} und wird ${supportText}. Die Volatilität wird als ${volText} eingestuft. Dieses Beispiel-Setup soll zeigen, wie die spätere Engine Bias, Sentiment und Timeframe-Kontext kombinieren kann.`;
}
/* eslint-enable @typescript-eslint/no-unused-vars */
/* -------------------------- Kleine UI-Komponenten ------------------------ */

type GaugeCardProps = {
  label: string;
  value: string;
  detail?: string;
};

function GaugeCard({ label, value, detail }: GaugeCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 p-3">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      {detail && (
        <p className="mt-0.5 text-[10px] text-white/50">{detail}</p>
      )}
    </div>
  );
}

type LevelBoxProps = {
  label: string;
  value: string;
  hint?: string;
};

function LevelBox({ label, value, hint }: LevelBoxProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 p-3">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[10px] text-white/50">{hint}</p>
      )}
    </div>
  );
}
