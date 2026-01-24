import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { head } from "@vercel/blob";

export type ArtifactSource = "blob" | "fs";

export type ArtifactMeta = {
  source: ArtifactSource;
  artifactId: string;
  tried: string[];
  pickedVersion?: string;
  fallbackReason?: string;
  loadedAt: string;
  generatedAt?: string;
  byteSize?: number | null;
};

export type ArtifactLoadResult<T> = {
  data: T;
  meta: ArtifactMeta;
};

export type ArtifactCandidate = {
  blobKey?: string;
  fsPath?: string;
};

async function readBlobJson(key: string, token: string): Promise<{ value: unknown; size?: number } | null> {
  try {
    const blob = await head(key, { token });
    if (!blob?.downloadUrl) return null;
    const res = await fetch(blob.downloadUrl);
    if (!res.ok) return null;
    const value = await res.json();
    const size = typeof blob.size === "number" ? blob.size : undefined;
    return { value, size };
  } catch {
    return null;
  }
}

async function readFsJson(fsPath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(fsPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Load an artifact trying Blob first (if token + key present), falling back to fs.
 */
export async function loadPhase1Artifact<T>(
  candidates: ArtifactCandidate[],
  parser: (value: unknown) => T,
): Promise<ArtifactLoadResult<T> | null> {
  const tried: string[] = [];
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const cand = candidates[idx];
    if (token && cand.blobKey) {
      tried.push(`blob:${cand.blobKey}`);
      const fromBlob = await readBlobJson(cand.blobKey, token);
      if (fromBlob !== null) {
        const parsed = parser(fromBlob.value);
        const meta: ArtifactMeta = {
          source: "blob",
          artifactId: cand.blobKey,
          tried,
          pickedVersion: pickVersion(cand.blobKey),
          fallbackReason: idx > 0 ? "earlier candidates unavailable" : undefined,
          loadedAt: new Date().toISOString(),
          generatedAt: getGeneratedAt(fromBlob.value),
          byteSize: fromBlob.size ?? null,
        };
        return { data: parsed, meta };
      }
    }
    if (cand.fsPath) {
      tried.push(`fs:${cand.fsPath}`);
      const fromFs = await readFsJson(cand.fsPath);
      if (fromFs !== null) {
        const size = await statSafe(cand.fsPath);
        const parsed = parser(fromFs);
        const meta: ArtifactMeta = {
          source: "fs",
          artifactId: cand.fsPath,
          tried,
          pickedVersion: pickVersion(cand.fsPath),
          fallbackReason: idx > 0 ? "earlier candidates unavailable" : undefined,
          loadedAt: new Date().toISOString(),
          generatedAt: getGeneratedAt(fromFs),
          byteSize: size,
        };
        return { data: parsed, meta };
      }
    }
  }

  return null;
}

function pickVersion(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const match = id.match(/latest-(v[0-9]+)/);
  return match ? match[1] : undefined;
}

function getGeneratedAt(val: unknown): string | undefined {
  if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
  const maybe = (val as { generatedAt?: unknown }).generatedAt;
  return typeof maybe === "string" ? maybe : undefined;
}

async function statSafe(fsPath: string): Promise<number | null> {
  try {
    const s = await stat(fsPath);
    return typeof s.size === "number" ? s.size : null;
  } catch {
    return null;
  }
}

export function phase1FsCandidates(baseName: string): ArtifactCandidate[] {
  const base = path.join(process.cwd(), "artifacts", "phase1");
  return [
    { fsPath: path.join(base, `${baseName}-latest-v2.json`) },
    { fsPath: path.join(base, `${baseName}-latest-v1.json`) },
  ];
}

export function phase1BlobCandidates(baseName: string): ArtifactCandidate[] {
  return [
    { blobKey: `phase1/${baseName}/${baseName}-latest-v2.json` },
    { blobKey: `phase1/${baseName}/${baseName}-latest-v1.json` },
  ];
}

export function buildPhase1Candidates(baseName: string): ArtifactCandidate[] {
  return [...phase1BlobCandidates(baseName), ...phase1FsCandidates(baseName)];
}
