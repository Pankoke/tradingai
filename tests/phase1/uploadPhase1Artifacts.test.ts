import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pickLatestOutcomeAnalysis } from "@/scripts/phase1/upload-phase1-artifacts-to-blob";

async function writeOutcomeFile(dir: string, name: string, generatedAt: string) {
  const file = path.join(dir, name);
  const payload = { generatedAt };
  await writeFile(file, JSON.stringify(payload), "utf-8");
  return file;
}

describe("pickLatestOutcomeAnalysis", () => {
  it("selects the newest generatedAt from timestamped v1 files", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "phase1-outcome-"));
    await writeOutcomeFile(dir, "swing-outcome-analysis-2026-01-21T12-00-00.000Z-v1.json", "2026-01-21T12:00:00.000Z");
    await writeOutcomeFile(dir, "swing-outcome-analysis-2026-01-25T15-04-21.597Z-v1.json", "2026-01-25T15:04:21.597Z");

    const pick = await pickLatestOutcomeAnalysis(dir);
    expect(pick).not.toBeNull();
    expect(pick?.fullPath).toContain("2026-01-25T15-04-21.597Z-v1.json");
    expect(pick?.generatedAt).toBe("2026-01-25T15:04:21.597Z");
  });
});
