import { describe, expect, it } from "vitest";
import { loadPhase1Artifact, type ArtifactLoadResult } from "@/lib/artifacts/storage";
import { writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

describe("loadPhase1Artifact", () => {
  it("falls back to fs when blob not available", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "artifact-test-"));
    const file = path.join(dir, "test.json");
    await writeFile(file, JSON.stringify({ hello: "world" }), "utf-8");

    const result = await loadPhase1Artifact<{ hello: string }>(
      [{ fsPath: file }],
      (val) => {
        const parsed = val as { hello?: string };
        if (!parsed || parsed.hello !== "world") throw new Error("parse failed");
        return { hello: parsed.hello };
      },
    );

    expect(result).not.toBeNull();
    const typed = result as ArtifactLoadResult<{ hello: string }>;
    expect(typed.data.hello).toBe("world");
    expect(typed.meta.source).toBe("fs");
    expect(typed.meta.artifactId).toBe(file);
    expect(typed.meta.tried.length).toBeGreaterThan(0);
    expect(typed.meta.loadedAt).toBeTruthy();
  });
});
