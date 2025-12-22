import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import type { PricePoint, PriceRange, SetupMeta, SetupSource, SetupViewModel } from "./types";
import { computeSignalQuality, type SignalQuality } from "@/src/lib/engine/signalQuality";
import type { RiskRewardSummary } from "@/src/lib/engine/types";
import { isEventModifierEnabledClient } from "@/src/lib/config/eventModifier";

function isHomepageSetup(input: SetupSource): input is HomepageSetup {
  if ("weakSignal" in input || "eventLevel" in input) {
    return true;
  }
  if (!("entryZone" in input)) return false;
  const entryZone = (input as { entryZone?: unknown }).entryZone;
  return (
    entryZone !== null &&
    typeof entryZone === "object" &&
    "from" in (entryZone as Record<string, unknown>) &&
    "to" in (entryZone as Record<string, unknown>)
  );
}

function normalizeRangeFromString(value?: string | null): PriceRange {
  if (!value) return { from: null, to: null, display: undefined };
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return { from: null, to: null, display: value };
  if (matches.length === 1) {
    const parsed = Number(matches[0]);
    return {
      from: Number.isFinite(parsed) ? parsed : null,
      to: Number.isFinite(parsed) ? parsed : null,
      display: value,
    };
  }
  const [a, b] = matches.map((m) => Number(m));
  return {
    from: Number.isFinite(a) ? a : null,
    to: Number.isFinite(b) ? b : null,
    display: value,
  };
}

function normalizePointFromString(value?: string | null): PricePoint {
  if (!value) return { value: null, display: undefined };
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return { value: null, display: value };
  const parsed = Number(match[0]);
  return {
    value: Number.isFinite(parsed) ? parsed : null,
    display: value,
  };
}

function parseHomepageEntry(entryZone: HomepageSetup["entryZone"]): PriceRange {
  return {
    from: Number.isFinite(entryZone.from ?? NaN) ? entryZone.from : null,
    to: Number.isFinite(entryZone.to ?? NaN) ? entryZone.to : null,
    display: undefined,
  };
}

function parseHomepagePoint(value: number | null | undefined): PricePoint {
  return {
    value: Number.isFinite(value ?? NaN) ? (value as number) : null,
    display: undefined,
  };
}

function deriveEventLevelFromScore(score?: number | null): "high" | "medium" | "low" | null {
  if (!Number.isFinite(score ?? NaN)) return null;
  if ((score as number) >= 70) return "high";
  if ((score as number) >= 40) return "medium";
  return "low";
}

export function toSetupViewModel(input: SetupSource, opts?: { generatedAt?: string | null }): SetupViewModel {
  if (isHomepageSetup(input)) {
    return mapHomepageSetup(input, opts);
  }
  return mapSetup(input, opts);
}

function mapSetup(setup: Setup, opts?: { generatedAt?: string | null }): SetupViewModel {
  const entry = normalizeRangeFromString(setup.entryZone ?? null);
  const stop = normalizePointFromString(setup.stopLoss ?? null);
  const tp = normalizePointFromString(setup.takeProfit ?? null);
  const modifierEnabled = isEventModifierEnabledClient();
  const eventLevel = modifierEnabled ? null : deriveEventLevelFromScore(setup.rings?.eventScore);
  const signalQuality = computeSignalQuality(setup);
  const meta: SetupMeta = {
    snapshotId: setup.snapshotId ?? null,
    snapshotCreatedAt: setup.snapshotCreatedAt ?? null,
    generatedAt: opts?.generatedAt ?? setup.snapshotCreatedAt ?? null,
    snapshotTime: setup.snapshotCreatedAt ?? null,
    eventLevel,
    weakSignal: undefined,
  };

  return {
    id: setup.id,
    assetId: setup.assetId,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
    direction: setup.direction,
    type: setup.type ?? null,
    rings: setup.rings,
    eventContext: setup.eventContext ?? null,
    eventModifier: setup.eventModifier ?? null,
    riskReward: setup.riskReward ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
    sentiment: setup.sentiment ?? null,
    levelDebug: setup.levelDebug ?? null,
    signalQuality,
    entry,
    stop,
    takeProfit: tp,
    bias: undefined,
    orderflowMode: setup.orderflowMode ?? null,
    meta,
  };
}

function mapHomepageSetup(setup: HomepageSetup, opts?: { generatedAt?: string | null }): SetupViewModel {
  const entry = parseHomepageEntry(setup.entryZone);
  const stop = parseHomepagePoint(setup.stopLoss);
  const tp = parseHomepagePoint(setup.takeProfit);
  const meta: SetupMeta = {
    snapshotId: setup.snapshotId ?? null,
    snapshotCreatedAt: setup.snapshotCreatedAt ?? null,
    snapshotTime: setup.snapshotTimestamp,
    generatedAt: opts?.generatedAt ?? setup.snapshotCreatedAt ?? setup.snapshotTimestamp ?? null,
    eventLevel: setup.eventLevel ?? null,
    weakSignal: setup.weakSignal ?? false,
  };
  const result: SetupViewModel = {
    id: setup.id,
    assetId: setup.assetId,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
    direction: setup.direction,
    rings: setup.rings,
    eventContext: setup.eventContext ?? null,
    eventModifier: setup.eventModifier ?? null,
    riskReward: setup.riskReward ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
    sentiment: setup.sentiment ?? null,
    levelDebug: setup.levelDebug ?? null,
    signalQuality: deriveSignalQualityFromRings(setup.rings),
    entry,
    stop,
    takeProfit: tp,
    bias: setup.bias ?? null,
    orderflowMode: setup.orderflowMode ?? null,
    meta,
  };

  if (!result.riskReward) {
    result.riskReward = deriveRiskReward(entry, stop, tp);
  }

  return result;
}

function deriveRiskReward(entry: PriceRange, stop: PricePoint, tp: PricePoint): RiskRewardSummary | null {
  const entryValues = [entry.from, entry.to].filter((v): v is number => typeof v === "number");
  if (entryValues.length === 0 || stop.value === null || tp.value === null) {
    return null;
  }
  const entryMid = entryValues.reduce((sum, v) => sum + v, 0) / entryValues.length;
  if (entryMid === 0) return null;
  const risk = Math.abs(entryMid - stop.value) / Math.abs(entryMid);
  const reward = Math.abs(tp.value - entryMid) / Math.abs(entryMid);
  if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0) {
    return null;
  }
  const rrr = reward / risk;
  return {
    riskPercent: clamp(Math.round(risk * 100), 0, 10_000),
    rewardPercent: clamp(Math.round(reward * 100), 0, 10_000),
    rrr: Number.isFinite(rrr) ? clamp(rrr, 0, 10_000) : null,
    volatilityLabel: null,
  };
}

function deriveSignalQualityFromRings(rings: Setup["rings"]): SignalQuality | null {
  if (!rings) return null;
  const modifierEnabled = isEventModifierEnabledClient();
  const clampScore = (v?: number | null): number | null =>
    typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), 0, 100) : null;
  const trend = clampScore(rings.trendScore);
  const bias = clampScore(rings.biasScore);
  const sentiment = clampScore(rings.sentimentScore);
  const orderflow = clampScore(rings.orderflowScore);
  const confidence = clampScore(rings.confidenceScore);
  const eventScore = modifierEnabled ? null : clampScore(rings.eventScore);

  const inputs = [trend, bias, sentiment, orderflow, confidence].filter((v): v is number => v !== null);
  const base = inputs.length ? inputs.reduce((s, v) => s + v, 0) / inputs.length : 50;
  const penalty = eventScore !== null ? clamp(Math.round((eventScore - 50) * 0.3), -10, 10) : 0;
  const finalScore = clamp(Math.round(base - penalty), 0, 100);
  let grade: SignalQuality["grade"] = "D";
  if (finalScore >= 80) grade = "A";
  else if (finalScore >= 60) grade = "B";
  else if (finalScore >= 40) grade = "C";
  const reasons: string[] = [];
  const strongest = getStrongestRing([
    ["trend", trend],
    ["bias", bias],
    ["orderflow", orderflow],
    ["sentiment", sentiment],
  ]);
  const weakest = getWeakestRing([
    ["trend", trend],
    ["bias", bias],
    ["orderflow", orderflow],
    ["sentiment", sentiment],
  ]);
  if (strongest) reasons.push(`perception.signalQuality.reason.strong.${strongest}`);
  if (weakest) reasons.push(`perception.signalQuality.reason.weak.${weakest}`);
  if (reasons.length === 0) reasons.push("perception.signalQuality.reason.default");

  return {
    score: finalScore,
    grade,
    labelKey: `perception.signalQuality.grade.${grade}`,
    reasons,
  };
}

function getStrongestRing(entries: Array<[string, number | null]>): string | null {
  const filtered = entries.filter(([, v]) => v !== null) as Array<[string, number]>;
  if (!filtered.length) return null;
  return filtered.sort((a, b) => b[1] - a[1])[0][0];
}

function getWeakestRing(entries: Array<[string, number | null]>): string | null {
  const filtered = entries.filter(([, v]) => v !== null) as Array<[string, number]>;
  if (!filtered.length) return null;
  return filtered.sort((a, b) => a[1] - b[1])[0][0];
}

export const setupViewModelTestExports = {
  isHomepageSetup,
  normalizeRangeFromString,
  normalizePointFromString,
  deriveEventLevelFromScore,
  deriveRiskReward,
  deriveSignalQualityFromRings,
};
