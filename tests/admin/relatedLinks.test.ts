import { describe, expect, it } from "vitest";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import {
  ADMIN_SECTIONS,
  buildAdminHref,
  buildSectionRelatedLinks,
  getSectionLabelKeys,
} from "@/src/components/admin/relatedLinks";

describe("admin related links", () => {
  it("builds locale-aware hrefs for data monitoring", () => {
    const result = buildSectionRelatedLinks({
      section: "dataMonitoring",
      locale: "de",
      pathname: "/de/admin/marketdata",
      labels: {
        snapshots: "Snapshots",
        marketDataHealth: "Market Data Health",
        coverage: "Coverage",
        healthReports: "Health Reports",
      },
    });

    expect(buildAdminHref("de", "/admin/marketdata")).toBe("/de/admin/marketdata");
    expect(result.activeKey).toBe("marketDataHealth");
    expect(result.links.find((link) => link.key === "marketDataHealth")?.href).toBe("/de/admin/marketdata");
  });

  it("marks reports detail routes as health reports", () => {
    const result = buildSectionRelatedLinks({
      section: "dataMonitoring",
      locale: "de",
      pathname: "/de/admin/monitoring/reports/2026-01-01",
      labels: {
        snapshots: "Snapshots",
        marketDataHealth: "Market Data Health",
        coverage: "Coverage",
        healthReports: "Health Reports",
      },
    });

    expect(result.activeKey).toBe("healthReports");
  });

  it("marks assets subroutes as assets in catalog", () => {
    const result = buildSectionRelatedLinks({
      section: "catalog",
      locale: "en",
      pathname: "/en/admin/assets/new",
      labels: {
        assets: "Assets",
        events: "Events",
      },
    });

    expect(result.activeKey).toBe("assets");
  });

  it("avoids system health false positives for coverage route", () => {
    const dataMonitoring = buildSectionRelatedLinks({
      section: "dataMonitoring",
      locale: "de",
      pathname: "/de/admin/system/coverage",
      labels: {
        snapshots: "Snapshots",
        marketDataHealth: "Market Data Health",
        coverage: "Coverage",
        healthReports: "Health Reports",
      },
    });
    const opsGovernance = buildSectionRelatedLinks({
      section: "opsGovernance",
      locale: "de",
      pathname: "/de/admin/system/coverage",
      labels: {
        operations: "Operations",
        auditTrail: "Audit Trail",
        systemHealth: "System",
      },
      fallbackActiveKey: "operations",
    });

    expect(dataMonitoring.activeKey).toBe("coverage");
    expect(opsGovernance.activeKey).not.toBe("systemHealth");
  });

  it("keeps required related-link label keys in both locales", () => {
    const labelKeys = ADMIN_SECTIONS.flatMap((section) => getSectionLabelKeys(section));
    const uniqueKeys = Array.from(new Set(labelKeys));

    uniqueKeys.forEach((key) => {
      expect(enMessages).toHaveProperty(key);
      expect(deMessages).toHaveProperty(key);
    });
  });
});
