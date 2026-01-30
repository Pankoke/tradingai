import type { SentimentSnapshotV2, SentimentWindow, SentimentComponents, SentimentSourceRef } from "./types";

type NormalizeParams = {
  assetId: string;
  asOfIso: string;
  window: SentimentWindow;
};

type NormalizedResult = {
  snapshot: SentimentSnapshotV2;
  warnings: string[];
};

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null;
}

function parseIso(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function parseNonNegative(value: unknown): number | undefined {
  const num = parseNumber(value);
  if (num === undefined || num < 0) return undefined;
  return num;
}

function mapComponents(raw: RawObject, warnings: string[]): SentimentComponents {
  const polarityRaw = parseNumber(raw.polarityScore ?? raw.polarity ?? raw.score);
  const momentumRaw = parseNumber(raw.momentumScore ?? raw.momentum);
  const confidenceRaw = parseNumber(raw.confidence);
  const volumeRaw = parseNonNegative(raw.volume);
  const biasRaw = parseNumber(raw.biasScore);
  const trendRaw = parseNumber(raw.trendScore);
  const orderflowRaw = parseNumber(raw.orderflowScore);
  const eventRaw = parseNumber(raw.eventScore);
  const rrrRaw = parseNumber(raw.rrr);
  const riskRaw = parseNumber(raw.riskPercent);
  const volLabelRaw = typeof raw.volatilityLabel === "string" ? raw.volatilityLabel : undefined;
  const driftRaw = parseNumber(raw.driftPct);

  const components: SentimentComponents = {};

  if (polarityRaw !== undefined) {
    components.polarityScore = clamp(polarityRaw, -1, 1);
  } else {
    warnings.push("missing_polarityScore");
  }

  if (momentumRaw !== undefined) {
    components.momentumScore = clamp(momentumRaw, -1, 1);
  }

  if (confidenceRaw !== undefined) {
    components.confidence = clamp(confidenceRaw, 0, 1);
  }

  if (volumeRaw !== undefined) {
    components.volume = volumeRaw;
  }

  if (biasRaw !== undefined) components.biasScore = clamp(biasRaw, 0, 100);
  if (trendRaw !== undefined) components.trendScore = clamp(trendRaw, 0, 100);
  if (momentumRaw !== undefined && components.momentumScore === undefined) {
    components.momentumScore = clamp(momentumRaw, -1, 1);
  }
  if (orderflowRaw !== undefined) components.orderflowScore = clamp(orderflowRaw, 0, 100);
  if (eventRaw !== undefined) components.eventScore = clamp(eventRaw, 0, 100);
  if (rrrRaw !== undefined) components.rrr = rrrRaw;
  if (riskRaw !== undefined) components.riskPercent = riskRaw;
  if (volLabelRaw) components.volatilityLabel = volLabelRaw;
  if (driftRaw !== undefined) components.driftPct = driftRaw;

  return components;
}

function mapSources(raw: RawObject, warnings: string[]): SentimentSourceRef[] {
  const sourcesRaw = raw.sources;
  if (Array.isArray(sourcesRaw)) {
    const mapped: SentimentSourceRef[] = [];
    for (const entry of sourcesRaw) {
      if (!isObject(entry)) {
        warnings.push("invalid_source_entry");
        continue;
      }
      const sourceId = typeof entry.sourceId === "string"
        ? entry.sourceId
        : typeof entry.id === "string"
          ? entry.id
          : typeof entry.source === "string"
            ? entry.source
            : undefined;
      if (!sourceId) {
        warnings.push("source_missing_id");
        continue;
      }
      const updatedAtIso = parseIso(entry.updatedAt ?? entry.timestamp);
      const weight = parseNumber(entry.weight);
      mapped.push({ sourceId, updatedAtIso, weight });
    }
    if (mapped.length === 0) {
      warnings.push("sources_empty_after_validation");
    }
    return mapped;
  }

  const singleSourceId =
    typeof raw.sourceId === "string"
      ? raw.sourceId
      : typeof raw.source === "string"
        ? raw.source
        : undefined;
  if (!singleSourceId) {
    warnings.push("missing_source");
    return [];
  }
  const updatedAtIso = parseIso(raw.updatedAt ?? raw.timestamp);
  const weight = parseNumber(raw.weight);
  return [{ sourceId: singleSourceId, updatedAtIso, weight }];
}

export function normalizeSentimentRawToSnapshot(raw: unknown, params: NormalizeParams): NormalizedResult {
  const warnings: string[] = [];
  if (!isObject(raw)) {
    warnings.push("raw_not_object");
  }

  const safeRaw: RawObject = isObject(raw) ? raw : {};

  const snapshot: SentimentSnapshotV2 = {
    assetId: params.assetId,
    asOfIso: params.asOfIso,
    window: params.window,
    sources: mapSources(safeRaw, warnings),
    components: mapComponents(safeRaw, warnings),
    meta: undefined,
  };

  const metaRaw = safeRaw.meta;
  if (isObject(metaRaw)) {
    const meta: Record<string, string | number | boolean | null> = {};
    Object.entries(metaRaw).forEach(([key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        meta[key] = value;
      }
    });
    if (Object.keys(meta).length > 0) {
      snapshot.meta = meta;
    }
  }

  return { snapshot, warnings };
}
