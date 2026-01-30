import type { SentimentSnapshotV2, SentimentWindow } from "./types";

// Domain stays server-free; source ids are treated as opaque strings.
export type SentimentSourceId = string;

export type MergeInput = {
  snapshot: SentimentSnapshotV2;
  sourceId: SentimentSourceId;
  weight: number;
};

export type MergeResult = {
  combined: SentimentSnapshotV2;
  warnings: string[];
  perSource?: Record<
    SentimentSourceId,
    {
      used: boolean;
      warnings: string[];
    }
  >;
};

type NumericField =
  | "biasScore"
  | "trendScore"
  | "orderflowScore"
  | "eventScore"
  | "confidence"
  | "momentumScore"
  | "riskPercent"
  | "rrr"
  | "driftPct";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampMomentum(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function weightedAverage(entries: Array<{ value: number; weight: number }>): number | undefined {
  const totalWeight = entries.reduce((acc, curr) => acc + curr.weight, 0);
  if (totalWeight === 0) return undefined;
  return entries.reduce((acc, curr) => acc + curr.value * curr.weight, 0) / totalWeight;
}

function mergeNumeric(
  key: NumericField,
  inputs: MergeInput[],
): { value: number | undefined; warnings: string[] } {
  const warnings: string[] = [];
  const collected: Array<{ value: number; weight: number }> = [];

  inputs.forEach((input) => {
    const raw = (input.snapshot.components as Record<string, unknown>)[key];
    if (isFiniteNumber(raw)) {
      collected.push({ value: raw, weight: input.weight });
    }
  });

  if (!collected.length) return { value: undefined, warnings };

  let value = weightedAverage(collected);
  if (typeof value !== "number" || Number.isNaN(value)) return { value: undefined, warnings };

  if (key === "confidence") value = clamp01(value);
  else if (key === "momentumScore") value = clampMomentum(value);
  else value = clampScore(value);

  return { value, warnings };
}

export function mergeSentimentSnapshots(
  inputs: MergeInput[],
  params: { assetId: string; asOfIso: string; window: SentimentWindow },
): MergeResult {
  const warnings: string[] = [];
  const perSource: Record<SentimentSourceId, { used: boolean; warnings: string[] }> = {};

  const usable = inputs.filter((entry) => {
    const sameAsset = entry.snapshot.assetId === params.assetId;
    if (!sameAsset) {
      warnings.push(`Skipping source ${entry.sourceId}: assetId mismatch`);
      perSource[entry.sourceId] = { used: false, warnings: ["assetId mismatch"] };
      return false;
    }
    if (entry.weight < 0) {
      warnings.push(`Skipping source ${entry.sourceId}: negative weight`);
      perSource[entry.sourceId] = { used: false, warnings: ["negative weight"] };
      return false;
    }
    perSource[entry.sourceId] = { used: true, warnings: [] };
    return true;
  });

  const combinedSources =
    usable.length > 0
      ? usable.map((entry) => {
          const updatedAtIso =
            entry.snapshot.sources.find((s) => s.sourceId === entry.sourceId)?.updatedAtIso ??
            entry.snapshot.asOfIso ??
            params.asOfIso;
          return {
            sourceId: entry.sourceId,
            weight: entry.weight,
            updatedAtIso,
          };
        })
      : [];

  const numericFields: NumericField[] = [
    "biasScore",
    "trendScore",
    "orderflowScore",
    "eventScore",
    "confidence",
    "momentumScore",
    "riskPercent",
    "rrr",
    "driftPct",
  ];

  const components: SentimentSnapshotV2["components"] = {};

  numericFields.forEach((field) => {
    const { value } = mergeNumeric(field, usable);
    if (typeof value === "number") {
      (components as Record<string, number>)[field] = value;
    }
  });

  // volatilityLabel: pick label from highest weight (tie -> first)
  const labelCandidate = usable
    .map((entry) => ({
      label: entry.snapshot.components.volatilityLabel,
      weight: entry.weight,
    }))
    .filter((c) => typeof c.label === "string")
    .sort((a, b) => b.weight - a.weight)[0];
  if (labelCandidate) components.volatilityLabel = labelCandidate.label as string;

  const combined: SentimentSnapshotV2 = {
    assetId: params.assetId,
    asOfIso: params.asOfIso,
    window: params.window,
    sources: combinedSources,
    components,
    meta: {},
  };

  return {
    combined,
    warnings,
    perSource: Object.keys(perSource).length ? perSource : undefined,
  };
}
