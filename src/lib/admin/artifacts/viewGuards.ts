export const DEFAULT_RAW_JSON_MAX_BYTES = 3 * 1024 * 1024;

export function shouldRenderRawJson(sizeBytes: number, maxBytes = DEFAULT_RAW_JSON_MAX_BYTES): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes >= 0 && sizeBytes <= maxBytes;
}
