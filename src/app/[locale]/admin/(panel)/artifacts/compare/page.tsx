import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import {
  diffArtifactSummaries,
  listArtifactTypeIds,
  readArtifactJson,
  resolveArtifactFile,
  summarizeArtifactJson,
  type ArtifactTypeId,
} from "@/src/lib/admin/artifacts/registry";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function asTypeId(value: string | undefined): ArtifactTypeId | null {
  if (!value) return null;
  return listArtifactTypeIds().includes(value as ArtifactTypeId) ? (value as ArtifactTypeId) : null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminArtifactsComparePage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const resolvedSearch = (await searchParams) ?? {};

  const leftType = asTypeId(firstParam(resolvedSearch.leftType));
  const leftFile = firstParam(resolvedSearch.leftFile);
  const rightType = asTypeId(firstParam(resolvedSearch.rightType));
  const rightFile = firstParam(resolvedSearch.rightFile);

  if (!leftType || !leftFile || !rightType || !rightFile) {
    return (
      <CompareError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.invalidSelection"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  if (leftType !== rightType) {
    return (
      <CompareError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.typeMismatch"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  let left = null;
  let right = null;
  try {
    left = await resolveArtifactFile({ typeId: leftType, filename: leftFile });
    right = await resolveArtifactFile({ typeId: rightType, filename: rightFile });
  } catch {
    return (
      <CompareError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.fileNotFound"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  let leftJson: unknown;
  let rightJson: unknown;
  try {
    [leftJson, rightJson] = await Promise.all([readArtifactJson(left), readArtifactJson(right)]);
  } catch {
    return (
      <CompareError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.readFailed"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  const leftSummary = summarizeArtifactJson(leftType, leftJson);
  const rightSummary = summarizeArtifactJson(rightType, rightJson);
  const diff = diffArtifactSummaries(leftSummary, rightSummary);
  const sameFile = left.typeId === right.typeId && left.filename === right.filename;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={messages["admin.artifacts.compare.title"]}
        description={messages["admin.artifacts.compare.description"]}
        notice={messages["admin.artifacts.notice"]}
        variant="info"
      />

      {sameFile ? (
        <section className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
          {messages["admin.artifacts.compare.sameFile"]}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {[left, right].map((file, idx) => (
          <div key={file.absolutePath} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-200">
            <h2 className="font-semibold text-white">
              {idx === 0 ? messages["admin.artifacts.compare.left"] : messages["admin.artifacts.compare.right"]}
            </h2>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div>{messages["admin.artifacts.meta.type"]}: {file.typeId}</div>
              <div>{messages["admin.artifacts.meta.path"]}: {file.relativePath}</div>
              <div>{messages["admin.artifacts.meta.modified"]}: {new Date(file.mtimeIso).toLocaleString(locale === "de" ? "de-DE" : "en-US")}</div>
              <div>{messages["admin.artifacts.meta.size"]}: {file.sizeBytes} B</div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-semibold text-white">{messages["admin.artifacts.compare.summaryDiff"]}</h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
          <div>{messages["admin.artifacts.compare.numericLeft"]}: {diff.numericKeysLeft}</div>
          <div>{messages["admin.artifacts.compare.numericRight"]}: {diff.numericKeysRight}</div>
        </div>
        <div className="mt-3 text-xs text-slate-300">
          {messages["admin.artifacts.compare.added"]}: {diff.numericKeysAdded.length ? diff.numericKeysAdded.join(", ") : "-"}
        </div>
        <div className="mt-1 text-xs text-slate-300">
          {messages["admin.artifacts.compare.removed"]}: {diff.numericKeysRemoved.length ? diff.numericKeysRemoved.join(", ") : "-"}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-semibold text-white">{messages["admin.artifacts.compare.topDeltas"]}</h3>
        {diff.numericDeltas.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">{messages["admin.artifacts.compare.noDelta"]}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">{messages["admin.artifacts.compare.key"]}</th>
                  <th className="px-3 py-2">{messages["admin.artifacts.compare.left"]}</th>
                  <th className="px-3 py-2">{messages["admin.artifacts.compare.right"]}</th>
                  <th className="px-3 py-2">{messages["admin.artifacts.compare.delta"]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-200">
                {diff.numericDeltas.map((entry) => (
                  <tr key={entry.key}>
                    <td className="px-3 py-2 font-mono text-xs">{entry.key}</td>
                    <td className="px-3 py-2">{entry.left}</td>
                    <td className="px-3 py-2">{entry.right}</td>
                    <td className="px-3 py-2">{entry.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <Link href={`/${locale}/admin/artifacts`} className="text-xs text-sky-300 hover:text-sky-100">
          {messages["admin.artifacts.actions.backToList"]}
        </Link>
      </div>
    </div>
  );
}

function CompareError({
  locale,
  title,
  message,
  backLabel,
}: {
  locale: Locale;
  title: string;
  message: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-6">
      <AdminSectionHeader title={title} description={message} variant="warning" />
      <section className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-100">
        <p>{message}</p>
        <Link href={`/${locale}/admin/artifacts`} className="mt-3 inline-block text-xs text-sky-300 hover:text-sky-100">
          {backLabel}
        </Link>
      </section>
    </div>
  );
}
