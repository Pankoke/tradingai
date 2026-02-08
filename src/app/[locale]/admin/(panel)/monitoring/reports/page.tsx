import { promises as fs } from "fs";
import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildDataMonitoringRelatedLinks } from "@/src/components/admin/relatedLinks";

type PageProps = {
  params: Promise<{ locale: string }>;
};

async function listReports(): Promise<string[]> {
  const dir = path.resolve(process.cwd(), "reports", "weekly");
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(/\.md$/, ""))
      .sort((a, b) => (a > b ? -1 : 1));
  } catch {
    return [];
  }
}

export default async function ReportsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const messages = typedLocale === "de" ? deMessages : enMessages;
  const reports = await listReports();
  const related = buildDataMonitoringRelatedLinks(typedLocale, {
    snapshots: messages["admin.nav.snapshots"],
    marketData: messages["admin.nav.marketdataHealth"],
    coverage: messages["admin.nav.coverage"],
    healthReports: messages["admin.nav.healthReports"],
  });

  if (!reports.length) {
    return (
      <div className="space-y-4">
        <AdminSectionHeader
          title={messages["admin.reports.title"]}
          description={messages["admin.reports.description"]}
          relatedLabel={messages["admin.section.related"]}
          links={related}
          currentKey="healthReports"
          notice={messages["admin.reports.notice"]}
          variant="info"
        />
        <p className="text-sm text-slate-400">{messages["admin.reports.empty"]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={messages["admin.reports.title"]}
        description={messages["admin.reports.description"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="healthReports"
        notice={messages["admin.reports.notice"]}
        variant="info"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Datum</th>
              <th className="px-4 py-2 text-left">Assets</th>
              <th className="px-4 py-2 text-left">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {reports.map((date) => (
              <tr key={date} className="hover:bg-slate-900/80">
                <td className="px-4 py-2 font-semibold text-white">{date}</td>
                <td className="px-4 py-2 text-slate-300">Gold / BTC</td>
                <td className="px-4 py-2">
                  <Link className="text-sky-300 hover:text-sky-100" href={`/${locale}/admin/monitoring/reports/${date}`}>
                    {messages["admin.reports.view"]}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
