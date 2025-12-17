const WHITESPACE_PATTERN = /\s+/g;
const YOY_PATTERN = /\b(y\/y|yoy)\b/gi;
const MOM_PATTERN = /\b(m\/m|mom)\b/gi;

/**
 * Normalizes event titles for display only (DB/raw values remain unchanged).
 */
export function toDisplayTitle(rawTitle: string): string {
  if (!rawTitle) {
    return "";
  }
  let normalized = rawTitle.replace(WHITESPACE_PATTERN, " ").trim();
  normalized = normalized.replace(YOY_PATTERN, "YoY");
  normalized = normalized.replace(MOM_PATTERN, "MoM");
  return normalized;
}
