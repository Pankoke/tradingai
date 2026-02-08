import { createHash } from "node:crypto";

export function buildImportPreviewHash(params: {
  entityType: "assets" | "events";
  csvText: string;
  mode: "preview";
}): string {
  const hash = createHash("sha256");
  hash.update(`${params.entityType}:${params.mode}:`);
  hash.update(params.csvText);
  return hash.digest("hex");
}
