import { describe, expect, it } from "vitest";
import { applyArtifactTypeFilter, parseArtifactTypeFilter } from "@/src/lib/admin/artifacts/filter";
import { buildArtifactsHref } from "@/src/lib/admin/artifacts/links";
import { ARTIFACT_TYPES, type ArtifactTypeGroup } from "@/src/lib/admin/artifacts/registry";

function makeGroup(typeId: ArtifactTypeGroup["typeId"]): ArtifactTypeGroup {
  return {
    typeId,
    labelKey: `label.${typeId}`,
    baseDir: "artifacts/phase1",
    baseDirExists: true,
    files: [],
  };
}

describe("artifact filter", () => {
  it("parses valid type and filters to a single matching group", () => {
    const groups: ArtifactTypeGroup[] = [
      makeGroup(ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS),
      makeGroup(ARTIFACT_TYPES.JOIN_STATS),
      makeGroup(ARTIFACT_TYPES.SWING_PERFORMANCE_BREAKDOWN),
    ];
    const selectedType = parseArtifactTypeFilter(ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS);
    const filtered = applyArtifactTypeFilter(groups, selectedType);

    expect(selectedType).toBe(ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.typeId).toBe(ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS);
  });

  it("falls back to all groups when type is invalid", () => {
    const groups: ArtifactTypeGroup[] = [
      makeGroup(ARTIFACT_TYPES.SWING_OUTCOME_ANALYSIS),
      makeGroup(ARTIFACT_TYPES.JOIN_STATS),
    ];
    const selectedType = parseArtifactTypeFilter("invalid-type");
    const filtered = applyArtifactTypeFilter(groups, selectedType);

    expect(selectedType).toBeNull();
    expect(filtered).toHaveLength(groups.length);
  });

  it("builds locale-aware artifact href with optional type", () => {
    expect(buildArtifactsHref("de")).toBe("/de/admin/artifacts");
    expect(buildArtifactsHref("en", ARTIFACT_TYPES.JOIN_STATS)).toBe(
      `/en/admin/artifacts?type=${encodeURIComponent(ARTIFACT_TYPES.JOIN_STATS)}`,
    );
  });
});
