export type ConsensusSnapshot = {
  forecast: string;
  previous: string;
  delta?: string;
};

type NumericType = "percent" | "plain";

const NUMERIC_PATTERN = /^\s*(-?\d+(?:[.,]\d+)?)\s*(%|pct|pp)?\s*$/i;

export function resolveConsensusSnapshot(params: {
  forecast?: string | null;
  previous?: string | null;
  intlLocale: string;
}): ConsensusSnapshot | null {
  const forecastLabel = sanitizeLabel(params.forecast);
  const previousLabel = sanitizeLabel(params.previous);
  if (!forecastLabel || !previousLabel) {
    return null;
  }

  const parsedForecast = parseNumericValue(forecastLabel);
  const parsedPrevious = parseNumericValue(previousLabel);
  let delta: string | undefined;

  if (parsedForecast && parsedPrevious && parsedForecast.type === parsedPrevious.type) {
    const diff = parsedForecast.value - parsedPrevious.value;
    if (Number.isFinite(diff)) {
      delta = formatDelta(diff, parsedForecast.type, params.intlLocale);
    }
  }

  return {
    forecast: forecastLabel,
    previous: previousLabel,
    delta,
  };
}

function sanitizeLabel(value?: string | number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = typeof value === "string" ? value : String(value);
  const trimmed = text.trim();
  return trimmed.length ? trimmed : null;
}

function parseNumericValue(label: string): { value: number; type: NumericType } | null {
  const match = label.match(NUMERIC_PATTERN);
  if (!match) {
    return null;
  }
  const rawNumber = match[1]?.replace(",", ".");
  if (!rawNumber) {
    return null;
  }
  const value = Number.parseFloat(rawNumber);
  if (!Number.isFinite(value)) {
    return null;
  }
  const hasPercent = Boolean(match[2]);
  return {
    value,
    type: hasPercent ? "percent" : "plain",
  };
}

function formatDelta(diff: number, type: NumericType, intlLocale: string): string {
  const formatter = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(diff) < 1 ? 2 : 1,
  });
  const absolute = Math.abs(diff);
  const core = formatter.format(absolute);
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  const suffix = type === "percent" ? "pp" : "";
  return `${sign}${core}${suffix}`;
}
