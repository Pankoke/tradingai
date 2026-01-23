import { readFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

export type ArtifactSource = "blob" | "fs";

export type ArtifactLoadResult<T> = {
  data: T;
  source: ArtifactSource;
  location: string;
  tried: string[];
};

export type ArtifactCandidate = {
  blobKey?: string;
  fsPath?: string;
};

async function readBlobJson(key: string, token: string): Promise<unknown | null> {
  try {
    const blob = await get(key, { token });
    if (!blob?.downloadUrl) return null;
    const res = await fetch(blob.downloadUrl);
    if (!res.ok) return null;
    return await res.json();
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
 * Returns the first successfully parsed candidate.
 */
export async function loadPhase1Artifact<T>(
  candidates: ArtifactCandidate[],
  parser: (value: unknown) => T,
): Promise<ArtifactLoadResult<T> | null> {
  const tried: string[] = [];
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  for (const cand of candidates) {
    if (token && cand.blobKey) {
      tried.push(`blob:${cand.blobKey}`);
      const fromBlob = await readBlobJson(cand.blobKey, token);
      if (fromBlob !== null) {
        return {
          data: parser(fromBlob),
          source: "blob",
          location: cand.blobKey,
          tried,
        };
      }
    }
    if (cand.fsPath) {
      tried.push(`fs:${cand.fsPath}`);
      const fromFs = await readFsJson(cand.fsPath);
      if (fromFs !== null) {
        return {
          data: parser(fromFs),
          source: "fs",
          location: cand.fsPath,
          tried,
        };
      }
    }
  }

  return null;
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
    { blobKey: `phase1/${baseName}/latest-v2.json` },
    { blobKey: `phase1/${baseName}/latest-v1.json` },
  ];
}

export function buildPhase1Candidates(baseName: string): ArtifactCandidate[] {
  // try blob first (v2 -> v1), then fs (v2 -> v1)
  return [...phase1BlobCandidates(baseName), ...phase1FsCandidates(baseName)];
}
