const ASSET_ALLOWED_KEYS = new Set(["q", "status", "class", "limit", "sort"]);
const EVENT_ALLOWED_KEYS = new Set(["q", "impact", "from", "to", "limit", "sort"]);

type SearchValue = string | string[] | undefined;
type SearchParamsLike = Record<string, SearchValue>;

function normalizeSearchParams(searchParams: URLSearchParams | SearchParamsLike | undefined): URLSearchParams {
  if (!searchParams) return new URLSearchParams();
  if (searchParams instanceof URLSearchParams) return new URLSearchParams(searchParams);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string");
      if (first) params.set(key, first);
    }
  }
  return params;
}

function buildExportHref(basePath: string, allowedKeys: Set<string>, searchParams?: URLSearchParams | SearchParamsLike): string {
  const source = normalizeSearchParams(searchParams);
  const filtered = new URLSearchParams();
  for (const [key, value] of source.entries()) {
    if (!allowedKeys.has(key)) continue;
    filtered.set(key, value);
  }
  const query = filtered.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildAssetsExportHref(searchParams?: URLSearchParams | SearchParamsLike): string {
  return buildExportHref("/api/admin/assets/export", ASSET_ALLOWED_KEYS, searchParams);
}

export function buildEventsExportHref(searchParams?: URLSearchParams | SearchParamsLike): string {
  return buildExportHref("/api/admin/events/export", EVENT_ALLOWED_KEYS, searchParams);
}
