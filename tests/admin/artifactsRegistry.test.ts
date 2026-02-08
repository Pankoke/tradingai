import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  diffArtifactSummaries,
  getPreviousArtifactFile,
  listArtifactsByType,
  resolveArtifactFile,
  summarizeArtifactJson,
} from "@/src/lib/admin/artifacts/registry";

const tempDirs: string[] = [];

async function makeTempRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "artifacts-registry-"));
  tempDirs.push(root);
  await fs.mkdir(path.join(root, "artifacts", "phase1"), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (root) => {
      await fs.rm(root, { recursive: true, force: true });
    }),
  );
});

describe("artifacts registry", () => {
  it("lists only whitelisted artifact patterns and sorts latest first", async () => {
    const root = await makeTempRoot();
    const base = path.join(root, "artifacts", "phase1");

    const older = path.join(base, "swing-outcome-analysis-2026-01-01T10-00-00.000Z-v1.json");
    const newer = path.join(base, "swing-outcome-analysis-latest-v2.json");
    const ignored = path.join(base, "notes.md");

    await fs.writeFile(older, JSON.stringify({ overall: { outcomesTotal: 10 } }), "utf8");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await fs.writeFile(newer, JSON.stringify({ overall: { outcomesTotal: 20 } }), "utf8");
    await fs.writeFile(ignored, "ignored", "utf8");

    const groups = await listArtifactsByType({ rootDir: root, maxPerType: 10 });
    const outcomeGroup = groups.find((group) => group.typeId === "swing-outcome-analysis");

    expect(outcomeGroup).toBeDefined();
    expect(outcomeGroup?.files.length).toBe(2);
    expect(outcomeGroup?.files[0]?.filename).toBe("swing-outcome-analysis-latest-v2.json");
    expect(outcomeGroup?.files.some((file) => file.filename === "notes.md")).toBe(false);
  });

  it("rejects traversal and mismatched artifact filename", async () => {
    const root = await makeTempRoot();

    await expect(
      resolveArtifactFile({
        rootDir: root,
        typeId: "join-stats",
        filename: "../secret.json",
      }),
    ).rejects.toThrow("Invalid artifact filename");

    await expect(
      resolveArtifactFile({
        rootDir: root,
        typeId: "join-stats",
        filename: "swing-outcome-analysis-latest-v1.json",
      }),
    ).rejects.toThrow("Filename does not match artifact type");

    await expect(
      resolveArtifactFile({
        rootDir: root,
        typeId: "join-stats",
        filename: "join-stats-latest-v1.json",
      }),
    ).rejects.toThrow();
  });

  it("builds compact summary and diff for numeric fields", () => {
    const leftSummary = summarizeArtifactJson("join-stats", {
      join: { overall: { joinRate: 0.5, matched: 50, unmatched: 50 } },
      params: { days: 30 },
    });
    const rightSummary = summarizeArtifactJson("join-stats", {
      join: { overall: { joinRate: 0.65, matched: 65, unmatched: 35 } },
      params: { days: 30 },
    });
    const diff = diffArtifactSummaries(leftSummary, rightSummary);

    expect(leftSummary.topLevelKeys).toContain("join");
    expect(diff.numericDeltas.some((delta) => delta.key.includes("join.overall.joinRate"))).toBe(true);
    expect(diff.numericKeysAdded.length).toBe(0);
    expect(diff.numericKeysRemoved.length).toBe(0);
  });

  it("returns previous artifact in sorted sequence for compare-with-previous", () => {
    const files = [
      {
        typeId: "join-stats" as const,
        filename: "join-stats-latest-v3.json",
        relativePath: "artifacts/phase1/join-stats-latest-v3.json",
        absolutePath: "/tmp/join-stats-latest-v3.json",
        sizeBytes: 10,
        mtimeMs: 3,
        mtimeIso: "2026-01-03T00:00:00.000Z",
        parsedVersion: 3,
        parsedTimestamp: null,
      },
      {
        typeId: "join-stats" as const,
        filename: "join-stats-latest-v2.json",
        relativePath: "artifacts/phase1/join-stats-latest-v2.json",
        absolutePath: "/tmp/join-stats-latest-v2.json",
        sizeBytes: 10,
        mtimeMs: 2,
        mtimeIso: "2026-01-02T00:00:00.000Z",
        parsedVersion: 2,
        parsedTimestamp: null,
      },
      {
        typeId: "join-stats" as const,
        filename: "join-stats-latest-v1.json",
        relativePath: "artifacts/phase1/join-stats-latest-v1.json",
        absolutePath: "/tmp/join-stats-latest-v1.json",
        sizeBytes: 10,
        mtimeMs: 1,
        mtimeIso: "2026-01-01T00:00:00.000Z",
        parsedVersion: 1,
        parsedTimestamp: null,
      },
    ];

    expect(getPreviousArtifactFile(files, 0)?.filename).toBe("join-stats-latest-v2.json");
    expect(getPreviousArtifactFile(files, 1)?.filename).toBe("join-stats-latest-v1.json");
    expect(getPreviousArtifactFile(files, 2)).toBeNull();
  });
});
