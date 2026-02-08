export type AssetExportStatusFilter = "all" | "active" | "inactive";
export type AssetExportSort = "symbol" | "createdAt";

export type AssetsExportFilters = {
  q?: string;
  status: AssetExportStatusFilter;
  class?: string;
  limit?: number;
  sort: AssetExportSort;
};

export type EventExportImpactFilter = "all" | "high" | "medium" | "low";
export type EventExportSort = "timestamp" | "createdAt";

export type EventsExportFilters = {
  q?: string;
  impact: EventExportImpactFilter;
  from?: Date;
  to?: Date;
  limit?: number;
  sort: EventExportSort;
};

const MAX_EXPORT_LIMIT = 5000;

function parseOptionalTrimmed(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampLimit(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, MAX_EXPORT_LIMIT);
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date;
}

function parseAssetStatus(raw: string | null): AssetExportStatusFilter {
  return raw === "active" || raw === "inactive" ? raw : "all";
}

function parseAssetSort(raw: string | null): AssetExportSort {
  return raw === "createdAt" ? "createdAt" : "symbol";
}

function parseEventImpact(raw: string | null): EventExportImpactFilter {
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "all";
}

function parseEventSort(raw: string | null): EventExportSort {
  return raw === "createdAt" ? "createdAt" : "timestamp";
}

export function parseAssetsExportFilters(searchParams: URLSearchParams): AssetsExportFilters {
  return {
    q: parseOptionalTrimmed(searchParams.get("q")),
    status: parseAssetStatus(searchParams.get("status")),
    class: parseOptionalTrimmed(searchParams.get("class")),
    limit: clampLimit(searchParams.get("limit")),
    sort: parseAssetSort(searchParams.get("sort")),
  };
}

export function parseEventsExportFilters(searchParams: URLSearchParams): EventsExportFilters {
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (from && to && from > to) {
    return {
      q: parseOptionalTrimmed(searchParams.get("q")),
      impact: parseEventImpact(searchParams.get("impact")),
      from: to,
      to: from,
      limit: clampLimit(searchParams.get("limit")),
      sort: parseEventSort(searchParams.get("sort")),
    };
  }

  return {
    q: parseOptionalTrimmed(searchParams.get("q")),
    impact: parseEventImpact(searchParams.get("impact")),
    from,
    to,
    limit: clampLimit(searchParams.get("limit")),
    sort: parseEventSort(searchParams.get("sort")),
  };
}
