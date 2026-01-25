import { stat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

type UploadResult = {
  key: string;
  size: number;
};

type LatestOutcomePick = {
  fullPath: string;
  generatedAt?: string;
};

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const baseDir = path.join(process.cwd(), "artifacts", "phase1");
  const uploads: UploadResult[] = [];

  const outcomePick = await pickLatestOutcomeAnalysis(baseDir);
  if (outcomePick) {
    const data = await readFile(outcomePick.fullPath);
    const key = "phase1/swing-outcome-analysis/swing-outcome-analysis-latest-v2.json";
    const res = await put(key, data, {
      access: "public",
      contentType: "application/json",
      token,
      allowOverwrite: true,
    });
    uploads.push({ key: res.pathname, size: data.byteLength });
    console.log("Outcome analysis source:", outcomePick.fullPath);
    console.log("Outcome analysis generatedAt:", outcomePick.generatedAt ?? "n/a");
  }

  const joinLatest = path.join(baseDir, "join-stats-latest-v1.json");
  if (await exists(joinLatest)) {
    const data = await readFile(joinLatest);
    const key = "phase1/join-stats/join-stats-latest-v1.json";
    const res = await put(key, data, {
      access: "public",
      contentType: "application/json",
      token,
      allowOverwrite: true,
    });
    uploads.push({ key: res.pathname, size: data.byteLength });
  }

  if (uploads.length === 0) {
    throw new Error("No artifacts found to upload");
  }

  console.log("Uploaded artifacts:");
  uploads.forEach((u) => console.log(`- ${u.key} (${u.size} bytes)`));
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function parseGeneratedAt(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const maybe = (value as { generatedAt?: unknown }).generatedAt;
  return typeof maybe === "string" ? maybe : undefined;
}

export async function pickLatestOutcomeAnalysis(baseDir: string): Promise<LatestOutcomePick | null> {
  const pattern = /^swing-outcome-analysis-.*-v1\.json$/;
  const files = await readdir(baseDir);
  const candidates = files.filter((f) => pattern.test(f)).map((f) => path.join(baseDir, f));
  if (candidates.length === 0) {
    const fallback = path.join(baseDir, "swing-outcome-analysis-latest-v1.json");
    return (await exists(fallback)) ? { fullPath: fallback } : null;
  }

  let best: LatestOutcomePick | null = null;
  let bestTime = -1;
  for (const file of candidates) {
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const generatedAt = parseGeneratedAt(parsed);
    const ts = generatedAt ? Date.parse(generatedAt) : NaN;
    const compare = Number.isNaN(ts) ? await getMtime(file) : ts;
    if (compare > bestTime) {
      bestTime = compare;
      best = { fullPath: file, generatedAt };
    }
  }

  return best;
}

async function getMtime(file: string): Promise<number> {
  try {
    const info = await stat(file);
    return info.mtimeMs;
  } catch {
    return -1;
  }
}

const invoked = process.argv[1] && process.argv[1].includes("upload-phase1-artifacts-to-blob");
if (invoked) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
