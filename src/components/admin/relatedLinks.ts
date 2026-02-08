import type { Locale } from "@/i18n";
import type { AdminSectionRelatedLink } from "@/src/components/admin/AdminSectionHeader";

export type AdminSection = "outcomes" | "dataMonitoring" | "opsGovernance" | "catalog" | "backtesting";
export const ADMIN_SECTIONS: AdminSection[] = ["outcomes", "dataMonitoring", "opsGovernance", "catalog", "backtesting"];

export type OutcomesKey = "explorer" | "overview" | "diagnostics" | "engineHealth" | "swingPerformance";
export type DataMonitoringKey = "snapshots" | "marketDataHealth" | "coverage" | "healthReports";
export type OpsGovernanceKey = "operations" | "auditTrail" | "systemHealth";
export type CatalogKey = "assets" | "events";
export type BacktestingKey = "backtests";

export type SectionKeyMap = {
  outcomes: OutcomesKey;
  dataMonitoring: DataMonitoringKey;
  opsGovernance: OpsGovernanceKey;
  catalog: CatalogKey;
  backtesting: BacktestingKey;
};

export type RelatedLink<K extends string> = AdminSectionRelatedLink<K> & {
  labelKey: string;
  isLegacy?: boolean;
};

export type RelatedLinksResult<K extends string> = {
  activeKey: K;
  links: Array<RelatedLink<K>>;
};

type PathMatchMode = "exact" | "prefix";
type LinkDefinition<K extends string> = {
  key: K;
  path: string;
  labelKey: string;
  match: PathMatchMode;
  isLegacy?: boolean;
};

type LabelsFor<K extends string> = Record<K, string>;

type BuildSectionContext = {
  locale: Locale;
  pathname?: string;
};

type BuildRelatedArgs<S extends AdminSection> = BuildSectionContext & {
  section: S;
  labels: LabelsFor<SectionKeyMap[S]>;
  fallbackActiveKey?: SectionKeyMap[S];
};

const SECTION_DEFINITIONS: {
  [S in AdminSection]: Array<LinkDefinition<SectionKeyMap[S]>>;
} = {
  outcomes: [
    { key: "explorer", path: "/admin/outcomes", labelKey: "admin.outcomes.related.explorer", match: "exact" },
    { key: "overview", path: "/admin/outcomes/overview", labelKey: "admin.outcomes.related.overview", match: "exact" },
    { key: "diagnostics", path: "/admin/outcomes/diagnostics", labelKey: "admin.outcomes.related.diagnostics", match: "exact" },
    { key: "engineHealth", path: "/admin/outcomes/engine-health", labelKey: "admin.outcomes.related.engineHealth", match: "exact" },
    {
      key: "swingPerformance",
      path: "/admin/outcomes/swing-performance",
      labelKey: "admin.outcomes.related.swingPerformance",
      match: "exact",
      isLegacy: true,
    },
  ],
  dataMonitoring: [
    { key: "snapshots", path: "/admin/snapshots", labelKey: "admin.nav.snapshots", match: "prefix" },
    { key: "marketDataHealth", path: "/admin/marketdata", labelKey: "admin.nav.marketdataHealth", match: "exact" },
    { key: "coverage", path: "/admin/system/coverage", labelKey: "admin.nav.coverage", match: "exact" },
    { key: "healthReports", path: "/admin/monitoring/reports", labelKey: "admin.nav.healthReports", match: "prefix" },
  ],
  opsGovernance: [
    { key: "operations", path: "/admin/ops", labelKey: "admin.nav.ops", match: "exact" },
    { key: "auditTrail", path: "/admin/audit", labelKey: "admin.nav.audit", match: "exact" },
    // Exact-only by design so /admin/system/coverage never activates system health.
    { key: "systemHealth", path: "/admin/system", labelKey: "admin.nav.system", match: "exact" },
  ],
  catalog: [
    { key: "assets", path: "/admin/assets", labelKey: "admin.nav.assets", match: "prefix" },
    { key: "events", path: "/admin/events", labelKey: "admin.nav.events", match: "prefix" },
  ],
  backtesting: [{ key: "backtests", path: "/admin/backtests", labelKey: "admin.nav.backtests", match: "prefix" }],
};

function normalizePathname(pathname: string | undefined): string {
  if (!pathname) return "";
  const noQuery = pathname.split("?")[0]?.split("#")[0] ?? "";
  const parts = noQuery.split("/").filter(Boolean);
  if (parts.length >= 1 && (parts[0] === "de" || parts[0] === "en")) {
    return `/${parts.slice(1).join("/")}`;
  }
  return noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
}

function isPathMatch(pathname: string, targetPath: string, mode: PathMatchMode): boolean {
  if (!pathname) return false;
  if (mode === "exact") {
    return pathname === targetPath;
  }
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export function buildAdminHref(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`.replace(/\/{2,}/g, "/");
}

export function getSectionLabelKeys<S extends AdminSection>(section: S): Array<LinkDefinition<SectionKeyMap[S]>["labelKey"]> {
  return SECTION_DEFINITIONS[section].map((link) => link.labelKey);
}

export function buildSectionRelatedLinks<S extends AdminSection>({
  section,
  locale,
  pathname,
  labels,
  fallbackActiveKey,
}: BuildRelatedArgs<S>): RelatedLinksResult<SectionKeyMap[S]> {
  const defs = SECTION_DEFINITIONS[section];
  const normalized = normalizePathname(pathname);
  const computedActive = defs.find((link) => isPathMatch(normalized, link.path, link.match))?.key;
  const activeKey = computedActive ?? fallbackActiveKey ?? defs[0].key;
  const links = defs.map((def) => ({
    key: def.key,
    href: buildAdminHref(locale, def.path),
    labelKey: def.labelKey,
    label: labels[def.key],
    isLegacy: def.isLegacy,
  }));
  return { activeKey, links };
}

type DataMonitoringLabels = LabelsFor<DataMonitoringKey>;
type OpsGovernanceLabels = LabelsFor<OpsGovernanceKey>;
type CatalogLabels = LabelsFor<CatalogKey>;
type BacktestingLabels = LabelsFor<BacktestingKey>;

export function buildDataMonitoringRelatedLinks(
  locale: Locale,
  labels: DataMonitoringLabels,
): AdminSectionRelatedLink<DataMonitoringKey>[] {
  return buildSectionRelatedLinks({
    section: "dataMonitoring",
    locale,
    labels,
    fallbackActiveKey: "snapshots",
  }).links;
}

export function buildOpsGovernanceRelatedLinks(
  locale: Locale,
  labels: OpsGovernanceLabels,
): AdminSectionRelatedLink<OpsGovernanceKey>[] {
  return buildSectionRelatedLinks({
    section: "opsGovernance",
    locale,
    labels,
    fallbackActiveKey: "operations",
  }).links;
}

export function buildCatalogRelatedLinks(
  locale: Locale,
  labels: CatalogLabels,
): AdminSectionRelatedLink<CatalogKey>[] {
  return buildSectionRelatedLinks({
    section: "catalog",
    locale,
    labels,
    fallbackActiveKey: "assets",
  }).links;
}

export function buildBacktestingRelatedLinks(
  locale: Locale,
  labels: BacktestingLabels,
): AdminSectionRelatedLink<BacktestingKey>[] {
  return buildSectionRelatedLinks({
    section: "backtesting",
    locale,
    labels,
    fallbackActiveKey: "backtests",
  }).links;
}
