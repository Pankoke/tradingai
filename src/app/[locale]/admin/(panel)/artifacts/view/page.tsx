import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import {
  listArtifactTypeIds,
  readArtifactJson,
  resolveArtifactFile,
  summarizeArtifactJson,
  type ArtifactTypeId,
} from "@/src/lib/admin/artifacts/registry";
import { shouldRenderRawJson } from "@/src/lib/admin/artifacts/viewGuards";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function truncateJsonPreview(value: unknown, maxChars = 20000): { text: string; truncated: boolean } {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized.length <= maxChars) {
    return { text: serialized, truncated: false };
  }
  return { text: `${serialized.slice(0, maxChars)}\n...`, truncated: true };
}

function asTypeId(value: string | undefined): ArtifactTypeId | null {
  if (!value) return null;
  return listArtifactTypeIds().includes(value as ArtifactTypeId) ? (value as ArtifactTypeId) : null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminArtifactsViewPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const resolvedSearch = (await searchParams) ?? {};
  const typeId = asTypeId(firstParam(resolvedSearch.type));
  const filename = firstParam(resolvedSearch.file);

  if (!typeId || !filename) {
    return (
      <ArtifactViewError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.invalidSelection"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  let file = null;
  try {
    file = await resolveArtifactFile({ typeId, filename });
  } catch {
    return (
      <ArtifactViewError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.fileNotFound"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  let json: unknown;
  try {
    json = await readArtifactJson(file);
  } catch {
    return (
      <ArtifactViewError
        locale={locale}
        title={messages["admin.artifacts.error.title"]}
        message={messages["admin.artifacts.error.readFailed"]}
        backLabel={messages["admin.artifacts.actions.backToList"]}
      />
    );
  }

  const summary = summarizeArtifactJson(typeId, json);
  const canRenderRaw = shouldRenderRawJson(file.sizeBytes);
  const preview = canRenderRaw ? truncateJsonPreview(json) : null;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={messages["admin.artifacts.view.title"]}
        description={messages["admin.artifacts.view.description"]}
        notice={messages["admin.artifacts.notice"]}
        variant="info"
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">{file.filename}</h2>
          <Link href={`/${locale}/admin/artifacts`} className="text-xs text-sky-300 hover:text-sky-100">
            {messages["admin.artifacts.actions.backToList"]}
          </Link>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-2">
          <div>{messages["admin.artifacts.meta.type"]}: {typeId}</div>
          <div>{messages["admin.artifacts.meta.path"]}: {file.relativePath}</div>
          <div>{messages["admin.artifacts.meta.modified"]}: {new Date(file.mtimeIso).toLocaleString(locale === "de" ? "de-DE" : "en-US")}</div>
          <div>{messages["admin.artifacts.meta.size"]}: {file.sizeBytes} B</div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="text-sm font-semibold text-white">{messages["admin.artifacts.summary.title"]}</h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
          <div>{messages["admin.artifacts.summary.topLevelCount"]}: {summary.topLevelKeyCount}</div>
          <div>{messages["admin.artifacts.summary.numericCount"]}: {Object.keys(summary.numericScalars).length}</div>
        </div>
        <div className="mt-3 text-xs text-slate-300">
          {messages["admin.artifacts.summary.topLevelKeys"]}: {summary.topLevelKeys.join(", ") || "-"}
        </div>
        {summary.notable.length > 0 ? (
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            {summary.notable.map((entry) => (
              <div key={entry.key}>
                {entry.key}: <span className="text-slate-100">{String(entry.value)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-white">{messages["admin.artifacts.raw.title"]}</summary>
          {canRenderRaw && preview ? (
            <>
              <p className="mt-2 text-xs text-slate-400">
                {preview.truncated ? messages["admin.artifacts.raw.truncated"] : messages["admin.artifacts.raw.full"]}
              </p>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
                {preview.text}
              </pre>
            </>
          ) : (
            <p className="mt-2 text-xs text-amber-300">{messages["admin.artifacts.view.raw.tooLarge"]}</p>
          )}
        </details>
      </section>
    </div>
  );
}

function ArtifactViewError({
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
