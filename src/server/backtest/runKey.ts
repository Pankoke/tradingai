function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export type BacktestRunKeyInput = {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours: number;
  costsConfig?: unknown;
  exitPolicy?: unknown;
};

export function buildBacktestRunKey(input: BacktestRunKeyInput): string {
  const payload = {
    assetId: input.assetId,
    fromIso: input.fromIso,
    toIso: input.toIso,
    stepHours: input.stepHours,
    costsConfig: input.costsConfig ?? null,
    exitPolicy: input.exitPolicy ?? null,
  };
  return `bk|${stableStringify(payload)}`;
}
