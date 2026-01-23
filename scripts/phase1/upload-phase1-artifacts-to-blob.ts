import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

type ArtifactSpec = {
  name: string;
  files: string[];
};

const specs: ArtifactSpec[] = [
  { name: "swing-outcome-analysis", files: ["swing-outcome-analysis-latest-v2.json", "swing-outcome-analysis-latest-v1.json"] },
  { name: "join-stats", files: ["join-stats-latest-v1.json"] },
];

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const baseDir = path.join(process.cwd(), "artifacts", "phase1");
  const uploads: { key: string; size: number }[] = [];

  for (const spec of specs) {
    for (const filename of spec.files) {
      const full = path.join(baseDir, filename);
      if (!(await exists(full))) continue;
      const data = await readFile(full);
      const key = `phase1/${spec.name}/${filename}`;
      const res = await put(key, data, {
        access: "public",
        contentType: "application/json",
        token,
        allowOverwrite: true,
      });
      uploads.push({ key: res.pathname, size: data.byteLength });
      // only upload the first available file per spec to avoid redundant overwrites
      break;
    }
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
