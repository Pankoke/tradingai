import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import type { PricePoint, PriceRange, SetupMeta, SetupSource, SetupViewModel } from "./types";

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
  const eventLevel = deriveEventLevelFromScore(setup.rings?.eventScore);
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
    riskReward: setup.riskReward ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
    sentiment: setup.sentiment ?? null,
    levelDebug: setup.levelDebug ?? null,
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
  return {
    id: setup.id,
    assetId: setup.assetId,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
    direction: setup.direction,
    rings: setup.rings,
    eventContext: setup.eventContext ?? null,
    riskReward: setup.riskReward ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
    sentiment: setup.sentiment ?? null,
    levelDebug: setup.levelDebug ?? null,
    entry,
    stop,
    takeProfit: tp,
    bias: setup.bias ?? null,
    orderflowMode: setup.orderflowMode ?? null,
    meta,
  };
}

export const setupViewModelTestExports = {
  isHomepageSetup,
  normalizeRangeFromString,
  normalizePointFromString,
  deriveEventLevelFromScore,
};
