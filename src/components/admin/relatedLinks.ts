import type { Locale } from "@/i18n";
import type { AdminSectionRelatedLink } from "@/src/components/admin/AdminSectionHeader";

const dataMonitoringPaths = {
  snapshots: (locale: Locale) => `/${locale}/admin/snapshots`,
  marketData: (locale: Locale) => `/${locale}/admin/marketdata`,
  coverage: (locale: Locale) => `/${locale}/admin/system/coverage`,
  healthReports: (locale: Locale) => `/${locale}/admin/monitoring/reports`,
};

const opsGovernancePaths = {
  operations: (locale: Locale) => `/${locale}/admin/ops`,
  auditTrail: (locale: Locale) => `/${locale}/admin/audit`,
  systemHealth: (locale: Locale) => `/${locale}/admin/system`,
};

type DataMonitoringLabels = {
  snapshots: string;
  marketData: string;
  coverage: string;
  healthReports: string;
};

type OpsGovernanceLabels = {
  operations: string;
  auditTrail: string;
  systemHealth: string;
};

export function buildDataMonitoringRelatedLinks(
  locale: Locale,
  labels: DataMonitoringLabels,
): AdminSectionRelatedLink[] {
  return [
    { key: "snapshots", label: labels.snapshots, href: dataMonitoringPaths.snapshots(locale) },
    { key: "marketData", label: labels.marketData, href: dataMonitoringPaths.marketData(locale) },
    { key: "coverage", label: labels.coverage, href: dataMonitoringPaths.coverage(locale) },
    { key: "healthReports", label: labels.healthReports, href: dataMonitoringPaths.healthReports(locale) },
  ];
}

export function buildOpsGovernanceRelatedLinks(
  locale: Locale,
  labels: OpsGovernanceLabels,
): AdminSectionRelatedLink[] {
  return [
    { key: "operations", label: labels.operations, href: opsGovernancePaths.operations(locale) },
    { key: "auditTrail", label: labels.auditTrail, href: opsGovernancePaths.auditTrail(locale) },
    { key: "systemHealth", label: labels.systemHealth, href: opsGovernancePaths.systemHealth(locale) },
  ];
}
