import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { marked, Renderer } from "marked";

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
  const { date } = await params;
  const content = await loadReport(date);
  if (!content) return notFound();

  const renderer = new Renderer();
  renderer.html = (html) => {
    const escaped = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre>${escaped}</pre>`;
  };
  const html = marked.parse(content, { renderer });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Monitoring</p>
        <h1 className="text-2xl font-semibold text-white">Weekly Health Report</h1>
        <p className="text-sm text-slate-400">Datum: {date}</p>
      </div>
      <article
        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
