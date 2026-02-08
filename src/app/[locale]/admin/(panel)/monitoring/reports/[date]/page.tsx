import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { marked, Renderer } from "marked";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildDataMonitoringRelatedLinks } from "@/src/components/admin/relatedLinks";

type PageProps = {
  params: Promise<{ locale: string; date: string }>;
};

async function loadReport(date: string): Promise<string | null> {
  const filePath = path.resolve(process.cwd(), "reports", "weekly", `${date}.md`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch {
    return null;
  }
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { date, locale } = await params;
  const typedLocale = locale as Locale;
  const messages = typedLocale === "de" ? deMessages : enMessages;
  const content = await loadReport(date);
  if (!content) return notFound();
  const related = buildDataMonitoringRelatedLinks(typedLocale, {
    snapshots: messages["admin.nav.snapshots"],
    marketDataHealth: messages["admin.nav.marketdataHealth"],
    coverage: messages["admin.nav.coverage"],
    healthReports: messages["admin.nav.healthReports"],
  });

  const renderer = new Renderer();
  renderer.html = (html) => {
    const escaped = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre>${escaped}</pre>`;
  };
  const html = marked.parse(content, { renderer });

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        title={messages["admin.reports.detail.title"]}
        description={messages["admin.reports.detail.description"].replace("{date}", date)}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="healthReports"
        notice={messages["admin.reports.notice"]}
        variant="info"
      />
      <article
        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

