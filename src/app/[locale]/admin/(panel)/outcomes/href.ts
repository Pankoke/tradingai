import type { Locale } from "@/i18n";
import {
  buildExplorerHref,
  buildOverviewHref as buildOverviewHrefModel,
  mergeOverviewParams,
  type ExplorerQuery,
  type OverviewQuery,
} from "./queryModel";

export type HrefParams = {
  locale: Locale;
  days: number;
  assetId?: string;
  playbookId?: string;
  showNoTradeType?: boolean;
  includeAllGrades?: boolean;
  includeNoTrade?: boolean;
};

export function buildHref(params: HrefParams): string {
  const normalized: ExplorerQuery = {
    days: params.days,
    assetId: params.assetId,
    playbookId: params.playbookId,
    includeAllGrades: Boolean(params.includeAllGrades),
    includeNoTrade: Boolean(params.includeNoTrade),
    showNoTradeType: Boolean(params.showNoTradeType),
  };
  return buildExplorerHref(params.locale, normalized);
}

export function buildOverviewHref(params: { locale: Locale; days: number; assetId?: string; playbookId?: string }): string {
  const base: OverviewQuery = {
    timeframe: "all",
    label: "all",
    minClosed: 20,
    includeOpenOnly: false,
    flag: "all",
    days: params.days,
  };
  return buildOverviewHrefModel(
    params.locale,
    "/admin/outcomes/overview",
    mergeOverviewParams(base, {
      days: params.days,
    }),
  );
}
