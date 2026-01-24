import type { Locale } from "@/i18n";

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
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  if (params.assetId) query.set("assetId", params.assetId);
  if (params.playbookId) query.set("playbookId", params.playbookId);
  if (params.showNoTradeType) query.set("showNoTradeType", "1");
  if (params.includeAllGrades) query.set("includeAllGrades", "1");
  if (params.includeNoTrade) query.set("includeNoTrade", "1");
  return `/${params.locale}/admin/outcomes?${query.toString()}`;
}
