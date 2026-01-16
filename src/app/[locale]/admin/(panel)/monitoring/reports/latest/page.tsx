import { promises as fs } from "fs";
import path from "path";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

async function getLatestDate(): Promise<string | null> {
  const dir = path.resolve(process.cwd(), "reports", "weekly");
  try {
    const entries = await fs.readdir(dir);
    const dates = entries
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(/\.md$/, ""))
      .sort((a, b) => (a > b ? -1 : 1));
    return dates[0] ?? null;
  } catch {
    return null;
  }
}

export default async function LatestReportPage({ params }: PageProps) {
  const { locale } = await params;
  const latest = await getLatestDate();
  if (!latest) return notFound();
  return redirect(`/${locale}/admin/monitoring/reports/${latest}`);
}
