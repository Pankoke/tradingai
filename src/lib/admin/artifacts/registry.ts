import { promises as fs } from "fs";
import path from "path";

export type ArtifactTypeId = "swing-outcome-analysis" | "join-stats" | "swing-performance-breakdown";
export const ARTIFACT_TYPES = {
  SWING_OUTCOME_ANALYSIS: "swing-outcome-analysis",
  JOIN_STATS: "join-stats",
  SWING_PERFORMANCE_BREAKDOWN: "swing-performance-breakdown",
} as const;

type ArtifactTypeConfig = {
  id: ArtifactTypeId;
  labelKey: string;
  baseDir: string;
  filenamePatterns: RegExp[];
};

export type ArtifactFileEntry = {
  typeId: ArtifactTypeId;
  filename: string;
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  mtimeMs: number;
  mtimeIso: string;
  parsedVersion: number | null;
  parsedTimestamp: string | null;
};

export type ArtifactTypeGroup = {
  typeId: ArtifactTypeId;
  labelKey: string;
  baseDir: string;
  baseDirExists: boolean;
  files: ArtifactFileEntry[];
};

export type ArtifactSummary = {
  topLevelKeys: string[];
  topLevelKeyCount: number;
  arrayKeys: Array<{ key: string; length: number }>;
  numericScalars: Record<string, number>;
  notable: Array<{ key: string; value: string | number }>;
};

export type ArtifactSummaryDiff = {
  numericKeysLeft: number;
  numericKeysRight: number;
  numericKeysAdded: string[];
  numericKeysRemoved: string[];
  numericDeltas: Array<{ key: string; left: number; right: number; delta: number }>;
};

const ARTIFACT_TYPE_CONFIGS: ArtifactTypeConfig[] = [
  {
    id: ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS,
    labelKey: "admin.artifacts.type.swingOutcomeAnalysis.label",
    baseDir: "artifacts/phase1",
    filenamePatterns: [/^swing-outcome-analysis-.*\.json$/],
  },
  {
    id: ARTIFACT_TYPES.JOIN_STATS,
    labelKey: "admin.artifacts.type.joinStats.label",
    baseDir: "artifacts/phase1",
    filenamePatterns: [/^join-stats-.*\.json$/],
  },
  {
    id: ARTIFACT_TYPES.SWING_PERFORMANCE_BREAKDOWN,
    labelKey: "admin.artifacts.type.swingPerformanceBreakdown.label",
    baseDir: "artifacts/phase1",
    filenamePatterns: [/^swing-performance-breakdown-.*\.json$/],
  },
];

type ListOptions = {
  rootDir?: string;
  maxPerType?: number;
};

type ResolveOptions = {
  typeId: ArtifactTypeId;
  filename: string;
  rootDir?: string;
};

function getTypeConfig(typeId: ArtifactTypeId): ArtifactTypeConfig {
  const config = ARTIFACT_TYPE_CONFIGS.find((candidate) => candidate.id === typeId);
  if (!config) {
    throw new Error(`Unsupported artifact type: ${typeId}`);
  }
  return config;
}

function parseVersion(filename: string): number | null {
  const match = filename.match(/-v(\d+)\.json$/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseTimestamp(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2}T[\d\-:.]+Z)/);
  return match?.[1] ?? null;
}

function matchesType(typeConfig: ArtifactTypeConfig, filename: string): boolean {
  return typeConfig.filenamePatterns.some((pattern) => pattern.test(filename));
}

function assertWithinBaseDir(targetAbsPath: string, baseDirAbsPath: string): void {
  const relative = path.relative(baseDirAbsPath, targetAbsPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Artifact path escapes allowed base directory");
  }
}

function collectNumericScalars(
  value: unknown,
  prefix: string,
  maxDepth: number,
  maxEntries: number,
  out: Record<string, number>,
): void {
  if (Object.keys(out).length >= maxEntries) return;
  if (typeof value === "number" && Number.isFinite(value)) {
    out[prefix || "value"] = value;
    return;
  }
  if (maxDepth <= 0 || !value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, child] of entries) {
    if (Object.keys(out).length >= maxEntries) break;
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    collectNumericScalars(child, childPrefix, maxDepth - 1, maxEntries, out);
  }
}

function topArrayKeys(value: Record<string, unknown>): Array<{ key: string; length: number }> {
  return Object.entries(value)
    .filter(([, child]) => Array.isArray(child))
    .map(([key, child]) => ({ key, length: (child as unknown[]).length }))
    .slice(0, 10);
}

function getPath(value: unknown, pathSegments: string[]): unknown {
  let cursor: unknown = value;
  for (const segment of pathSegments) {
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function buildNotable(typeId: ArtifactTypeId, json: unknown): Array<{ key: string; value: string | number }> {
  if (!json || typeof json !== "object") return [];
  if (typeId === "swing-outcome-analysis") {
    const outcomes = toNumberOrNull(getPath(json, ["overall", "outcomesTotal"]));
    const closed = toNumberOrNull(getPath(json, ["overall", "closedCount"]));
    const winRate = toNumberOrNull(getPath(json, ["overall", "winRate"]));
    return [
      { key: "overall.outcomesTotal", value: outcomes ?? "-" },
      { key: "overall.closedCount", value: closed ?? "-" },
      { key: "overall.winRate", value: winRate ?? "-" },
    ];
  }
  if (typeId === "join-stats") {
    const joinRate = toNumberOrNull(getPath(json, ["join", "overall", "joinRate"]));
    const matched = toNumberOrNull(getPath(json, ["join", "overall", "matched"]));
    const unmatched = toNumberOrNull(getPath(json, ["join", "overall", "unmatched"]));
    return [
      { key: "join.overall.joinRate", value: joinRate ?? "-" },
      { key: "join.overall.matched", value: matched ?? "-" },
      { key: "join.overall.unmatched", value: unmatched ?? "-" },
    ];
  }
  if (typeId === "swing-performance-breakdown") {
    const days = toNumberOrNull(getPath(json, ["params", "days"]));
    const minClosed = toNumberOrNull(getPath(json, ["params", "minClosed"]));
    const buckets = getPath(json, ["buckets"]);
    const bucketCount = Array.isArray(buckets) ? buckets.length : null;
    return [
      { key: "params.days", value: days ?? "-" },
      { key: "params.minClosed", value: minClosed ?? "-" },
      { key: "buckets.length", value: bucketCount ?? "-" },
    ];
  }
  return [];
}

export function listArtifactTypeIds(): ArtifactTypeId[] {
  return ARTIFACT_TYPE_CONFIGS.map((type) => type.id);
}

export function listArtifactTypeConfigs(): ArtifactTypeConfig[] {
  return [...ARTIFACT_TYPE_CONFIGS];
}

export function isArtifactTypeId(value: string): value is ArtifactTypeId {
  return listArtifactTypeIds().includes(value as ArtifactTypeId);
}

export async function listArtifactsByType(options: ListOptions = {}): Promise<ArtifactTypeGroup[]> {
  const rootDir = options.rootDir ?? process.cwd();
  const maxPerType = options.maxPerType ?? 10;

  const groups = await Promise.all(
    ARTIFACT_TYPE_CONFIGS.map(async (typeConfig) => {
      const baseAbs = path.resolve(rootDir, typeConfig.baseDir);
      let filenames: string[] = [];
      let baseDirExists = true;
      try {
        filenames = await fs.readdir(baseAbs);
      } catch {
        filenames = [];
        baseDirExists = false;
      }
      const matched = filenames.filter((filename) => matchesType(typeConfig, filename));
      const fileEntries = await Promise.all(
        matched.map(async (filename): Promise<ArtifactFileEntry | null> => {
          const absolutePath = path.resolve(baseAbs, filename);
          try {
            const stats = await fs.stat(absolutePath);
            if (!stats.isFile()) return null;
            return {
              typeId: typeConfig.id,
              filename,
              relativePath: path.posix.join(typeConfig.baseDir, filename),
              absolutePath,
              sizeBytes: stats.size,
              mtimeMs: stats.mtimeMs,
              mtimeIso: stats.mtime.toISOString(),
              parsedVersion: parseVersion(filename),
              parsedTimestamp: parseTimestamp(filename),
            };
          } catch {
            return null;
          }
        }),
      );
      const files = fileEntries
        .filter((entry): entry is ArtifactFileEntry => entry !== null)
        .sort((left, right) => right.mtimeMs - left.mtimeMs || right.filename.localeCompare(left.filename))
        .slice(0, Math.max(1, maxPerType));
      return {
        typeId: typeConfig.id,
        labelKey: typeConfig.labelKey,
        baseDir: typeConfig.baseDir,
        baseDirExists,
        files,
      };
    }),
  );

  return groups;
}

export function getPreviousArtifactFile(files: ArtifactFileEntry[], index: number): ArtifactFileEntry | null {
  if (index < 0 || index >= files.length) return null;
  return files[index + 1] ?? null;
}

export async function resolveArtifactFile(options: ResolveOptions): Promise<ArtifactFileEntry> {
  const { typeId, filename } = options;
  const rootDir = options.rootDir ?? process.cwd();
  const typeConfig = getTypeConfig(typeId);
  const baseAbs = path.resolve(rootDir, typeConfig.baseDir);

  if (filename !== path.basename(filename) || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid artifact filename");
  }
  if (!matchesType(typeConfig, filename)) {
    throw new Error("Filename does not match artifact type");
  }

  const absolutePath = path.resolve(baseAbs, filename);
  assertWithinBaseDir(absolutePath, baseAbs);

  const stats = await fs.stat(absolutePath);
  if (!stats.isFile()) {
    throw new Error("Artifact is not a file");
  }

  return {
    typeId,
    filename,
    relativePath: path.posix.join(typeConfig.baseDir, filename),
    absolutePath,
    sizeBytes: stats.size,
    mtimeMs: stats.mtimeMs,
    mtimeIso: stats.mtime.toISOString(),
    parsedVersion: parseVersion(filename),
    parsedTimestamp: parseTimestamp(filename),
  };
}

export async function readArtifactJson(file: ArtifactFileEntry): Promise<unknown> {
  const raw = await fs.readFile(file.absolutePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

export function summarizeArtifactJson(typeId: ArtifactTypeId, json: unknown): ArtifactSummary {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      topLevelKeys: [],
      topLevelKeyCount: 0,
      arrayKeys: [],
      numericScalars: {},
      notable: [],
    };
  }
  const asRecord = json as Record<string, unknown>;
  const topLevelKeys = Object.keys(asRecord).sort();
  const numericScalars: Record<string, number> = {};
  collectNumericScalars(asRecord, "", 3, 50, numericScalars);

  return {
    topLevelKeys: topLevelKeys.slice(0, 50),
    topLevelKeyCount: topLevelKeys.length,
    arrayKeys: topArrayKeys(asRecord),
    numericScalars,
    notable: buildNotable(typeId, json),
  };
}

export function diffArtifactSummaries(left: ArtifactSummary, right: ArtifactSummary): ArtifactSummaryDiff {
  const leftKeys = new Set(Object.keys(left.numericScalars));
  const rightKeys = new Set(Object.keys(right.numericScalars));
  const added = [...rightKeys].filter((key) => !leftKeys.has(key)).sort();
  const removed = [...leftKeys].filter((key) => !rightKeys.has(key)).sort();
  const intersection = [...leftKeys].filter((key) => rightKeys.has(key)).sort();
  const deltas = intersection
    .map((key) => {
      const leftValue = left.numericScalars[key];
      const rightValue = right.numericScalars[key];
      if (leftValue == null || rightValue == null) return null;
      return {
        key,
        left: leftValue,
        right: rightValue,
        delta: rightValue - leftValue,
      };
    })
    .filter((entry): entry is { key: string; left: number; right: number; delta: number } => entry !== null)
    .filter((entry) => entry.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 30);

  return {
    numericKeysLeft: leftKeys.size,
    numericKeysRight: rightKeys.size,
    numericKeysAdded: added,
    numericKeysRemoved: removed,
    numericDeltas: deltas,
  };
}
