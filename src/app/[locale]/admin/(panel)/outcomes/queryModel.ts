import type { Locale } from "@/i18n";

export type OverviewQuery = {
  timeframe: "all" | "1d" | "1w";
  label: "all" | "eod" | "us_open" | "morning" | "(null)";
  minClosed: number;
  includeOpenOnly: boolean;
  flag: "all" | "low-sample" | "mostly-open";
  days?: number;
};

export type ExplorerQuery = {
  days: number;
  assetId?: string;
  playbookId?: string;
  includeAllGrades: boolean;
  includeNoTrade: boolean;
  showNoTradeType: boolean;
  fromOverview?: boolean;
  fromTf?: string;
  fromLabel?: string;
};

type SearchParams = Record<string, string | undefined>;

const DEFAULT_OVERVIEW: OverviewQuery = {
  timeframe: "all",
  label: "all",
  minClosed: 20,
  includeOpenOnly: false,
  flag: "all",
};

export function parseOverviewParams(params: SearchParams): OverviewQuery {
  const timeframe = (params.timeframe ?? DEFAULT_OVERVIEW.timeframe).toLowerCase();
  const label = (params.label ?? DEFAULT_OVERVIEW.label).toLowerCase();
  const minClosed = Number.isFinite(Number(params.minClosed)) ? Number(params.minClosed) : DEFAULT_OVERVIEW.minClosed;
  const includeOpenOnly = params.includeOpenOnly === "1";
  const flag = (params.flag ?? DEFAULT_OVERVIEW.flag).toLowerCase();
  const days = Number.isFinite(Number(params.days)) ? Number(params.days) : undefined;

  return {
    timeframe: (timeframe === "1d" || timeframe === "1w" ? timeframe : "all"),
    label:
      label === "eod" || label === "us_open" || label === "morning" || label === "(null)" ? label : "all",
    minClosed,
    includeOpenOnly,
    flag: flag === "low-sample" || flag === "mostly-open" ? flag : "all",
    days,
  };
}

export function parseExplorerParams(params: SearchParams): ExplorerQuery {
  const days = Number.isFinite(Number(params.days)) ? Number(params.days) : 30;
  return {
    days,
    assetId: params.assetId || undefined,
    playbookId: params.playbookId || undefined,
    includeAllGrades: params.includeAllGrades === "1",
    includeNoTrade: params.includeNoTrade === "1",
    showNoTradeType: params.showNoTradeType === "1",
    fromOverview: params.fromOverview === "1",
    fromTf: params.fromTf || undefined,
    fromLabel: params.fromLabel || undefined,
  };
}

export function mergeOverviewParams(current: OverviewQuery, patch: Partial<OverviewQuery>): OverviewQuery {
  return {
    ...current,
    ...patch,
  };
}

export function buildOverviewHref(locale: Locale, basePath: string, params: OverviewQuery): string {
  const query = new URLSearchParams();
  query.set("timeframe", params.timeframe);
  query.set("label", params.label);
  query.set("minClosed", String(params.minClosed));
  if (params.includeOpenOnly) query.set("includeOpenOnly", "1");
  if (params.flag && params.flag !== "all") query.set("flag", params.flag);
  if (params.days) query.set("days", String(params.days));
  return `/${locale}${basePath}?${query.toString()}`;
}

export function buildExplorerHref(locale: Locale, params: ExplorerQuery): string {
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  if (params.assetId) query.set("assetId", params.assetId);
  if (params.playbookId) query.set("playbookId", params.playbookId);
  if (params.includeAllGrades) query.set("includeAllGrades", "1");
  if (params.includeNoTrade) query.set("includeNoTrade", "1");
  if (params.showNoTradeType) query.set("showNoTradeType", "1");
  if (params.fromOverview) query.set("fromOverview", "1");
  if (params.fromTf) query.set("fromTf", params.fromTf);
  if (params.fromLabel) query.set("fromLabel", params.fromLabel);
  return `/${locale}/admin/outcomes?${query.toString()}`;
}

export function buildExplorerHrefFromOverviewState(
  locale: Locale,
  overview: OverviewQuery,
  options: { playbookId?: string; assetId?: string; reportDays?: number } = {},
): string {
  const days = overview.days ?? options.reportDays ?? 30;
  return buildExplorerHref(locale, {
    days,
    playbookId: options.playbookId,
    assetId: options.assetId,
    includeAllGrades: false,
    includeNoTrade: false,
    showNoTradeType: false,
    fromOverview: true,
    fromTf: overview.timeframe,
    fromLabel: overview.label,
  });
}
