import type { ArtifactTypeGroup, ArtifactTypeId } from "@/src/lib/admin/artifacts/registry";
import { isArtifactTypeId } from "@/src/lib/admin/artifacts/registry";

export function parseArtifactTypeFilter(rawType: string | undefined): ArtifactTypeId | null {
  if (!rawType) return null;
  return isArtifactTypeId(rawType) ? rawType : null;
}

export function applyArtifactTypeFilter(
  groups: ArtifactTypeGroup[],
  selectedType: ArtifactTypeId | null,
): ArtifactTypeGroup[] {
  if (!selectedType) return groups;
  const filtered = groups.filter((group) => group.typeId === selectedType);
  return filtered.length > 0 ? filtered : groups;
}
