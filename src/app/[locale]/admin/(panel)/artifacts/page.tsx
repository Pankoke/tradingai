import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { getPreviousArtifactFile, listArtifactsByType } from "@/src/lib/admin/artifacts/registry";
import { applyArtifactTypeFilter, parseArtifactTypeFilter } from "@/src/lib/admin/artifacts/filter";
import { buildArtifactsHref } from "@/src/lib/admin/artifacts/links";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminArtifactsPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const resolvedSearch = (await searchParams) ?? {};
  const requestedType = firstParam(resolvedSearch.type);
  const messages = locale === "de" ? deMessages : enMessages;
  const t = (key: string): string => {
    const message = messages[key as keyof typeof messages];
    return typeof message === "string" ? message : key;
  };
  const groups = await listArtifactsByType({ maxPerType: 10 });
  const selectedType = parseArtifactTypeFilter(requestedType);
  const visibleGroups = applyArtifactTypeFilter(groups, selectedType);
  const hasAnyFiles = visibleGroups.some((group) => group.files.length > 0);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={messages["admin.artifacts.title"]}
        description={messages["admin.artifacts.description"]}
        notice={messages["admin.artifacts.notice"]}
        variant="info"
      />
      {selectedType ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <span className="text-xs text-slate-300">
            {messages["admin.artifacts.filter.active"]} {selectedType}
          </span>
          <Link href={buildArtifactsHref(locale)} className="text-xs text-sky-300 hover:text-sky-100">
            {messages["admin.artifacts.filter.clear"]}
          </Link>
        </div>
      ) : null}
      {!selectedType && requestedType ? (
        <p className="text-xs text-amber-300">{messages["admin.artifacts.filter.unknownIgnored"]}</p>
      ) : null}

      {!hasAnyFiles ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-base font-semibold text-white">{messages["admin.artifacts.empty.allTitle"]}</h2>
          <p className="mt-2 text-sm text-slate-300">{messages["admin.artifacts.empty.allDescription"]}</p>
          <p className="mt-2 text-xs text-slate-400">{messages["admin.artifacts.empty.hint"]}</p>
        </section>
      ) : null}

      {visibleGroups.map((group) => (
        <section key={group.typeId} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">{t(group.labelKey)}</h2>
            <span className="text-xs text-slate-400">{group.baseDir}</span>
          </div>
          {group.files.length === 0 ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-400">{messages["admin.artifacts.emptyType"]}</p>
              {!group.baseDirExists ? (
                <p className="text-xs text-amber-300">{messages["admin.artifacts.empty.baseDirMissing"]}</p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{messages["admin.artifacts.table.filename"]}</th>
                    <th className="px-3 py-2">{messages["admin.artifacts.table.modified"]}</th>
                    <th className="px-3 py-2">{messages["admin.artifacts.table.size"]}</th>
                    <th className="px-3 py-2">{messages["admin.artifacts.table.actions"]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-200">
                  {group.files.map((file, index) => {
                    const compareTarget = getPreviousArtifactFile(group.files, index);
                    const viewHref = `/${locale}/admin/artifacts/view?type=${encodeURIComponent(file.typeId)}&file=${encodeURIComponent(file.filename)}`;
                    const compareHref = compareTarget
                      ? `/${locale}/admin/artifacts/compare?leftType=${encodeURIComponent(compareTarget.typeId)}&leftFile=${encodeURIComponent(compareTarget.filename)}&rightType=${encodeURIComponent(file.typeId)}&rightFile=${encodeURIComponent(file.filename)}`
                      : null;
                    return (
                      <tr key={`${file.typeId}-${file.filename}`}>
                        <td className="px-3 py-2 font-mono text-xs">{file.filename}</td>
                        <td className="px-3 py-2">
                          {new Date(file.mtimeIso).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
                        </td>
                        <td className="px-3 py-2">{formatSize(file.sizeBytes)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-3 text-xs">
                            <Link href={viewHref} className="text-sky-300 hover:text-sky-100">
                              {messages["admin.artifacts.actions.view"]}
                            </Link>
                            {compareHref ? (
                              <Link href={compareHref} className="text-emerald-300 hover:text-emerald-100">
                                {messages["admin.artifacts.compare.withPrevious"]}
                              </Link>
                            ) : (
                              <span className="text-slate-500">{messages["admin.artifacts.compare.withPrevious"]}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
