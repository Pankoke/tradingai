import { promises as fs } from "fs";
import { notFound } from "next/navigation";
import Link from "next/link";
import path from "path";
import type { Locale } from "@/i18n";

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
  const reports = await listReports();

  if (!reports.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Weekly Health Reports</h1>
        <p className="text-sm text-slate-400">Keine Reports gefunden. Stelle sicher, dass reports/weekly/*.md vorhanden sind.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Monitoring</p>
        <h1 className="text-2xl font-semibold text-white">Weekly Health Reports</h1>
        <p className="text-sm text-slate-400">Automatisierte Phase0-Auswertungen (Gold & BTC).</p>
      </div>

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
                    Anzeigen
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
