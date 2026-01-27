import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadEngineHealth } from "@/src/server/admin/outcomeService";
import { FIX_DATE_ISO } from "@/src/server/services/outcomePolicy";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    days?: string;
    assetId?: string;
    playbookId?: string;
    engineVersion?: string;
    includeUnknown?: string;
    includeNullEvalTf?: string;
  }>;
};

const ALLOWED_DAYS = ["30", "90", "180", "365", "730"];

export default async function EngineHealthPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 90;
  const assetId = query.assetId;
  const playbookId = query.playbookId;
  const engineVersion = query.engineVersion;
  const includeUnknown = (query.includeUnknown ?? "") === "1";
  const includeNullEvalTf = (query.includeNullEvalTf ?? "") === "1";

  const rows = await loadEngineHealth({ days, assetId, playbookId, engineVersion, includeUnknown, includeNullEvalTf });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Engine Health (Forward Cohort)</h1>
        <p className="text-sm text-slate-300">
          Nur Outcomes ab {new Date(FIX_DATE_ISO).toISOString().slice(0, 10)} (cohort-policy). Status &quot;invalid&quot;
          ausgeschlossen.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/outcomes/engine-health?days=${value}${assetId ? `&assetId=${assetId}` : ""}${
                playbookId ? `&playbookId=${playbookId}` : ""
              }${engineVersion ? `&engineVersion=${engineVersion}` : ""}${includeUnknown ? "&includeUnknown=1" : ""}${
                includeNullEvalTf ? "&includeNullEvalTf=1" : ""
              }`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["", "gold-swing-v0.2", "index-swing-v0.1", "crypto-swing-v0.1", "fx-swing-v0.1", "generic-swing-v0.1"].map(
            (pb) => (
              <Link
                key={pb || "all"}
                href={`/${locale}/admin/outcomes/engine-health?days=${days}${assetId ? `&assetId=${assetId}` : ""}${
                  pb ? `&playbookId=${pb}` : ""
                }${engineVersion ? `&engineVersion=${engineVersion}` : ""}${includeUnknown ? "&includeUnknown=1" : ""}${
                  includeNullEvalTf ? "&includeNullEvalTf=1" : ""
                }`}
                className={`rounded-full px-3 py-1 font-semibold ${
                  pb === (playbookId ?? "") ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
              >
                {pb || "Alle Playbooks"}
              </Link>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/${locale}/admin/outcomes/engine-health?days=${days}${assetId ? `&assetId=${assetId}` : ""}${
              playbookId ? `&playbookId=${playbookId}` : ""
            }${engineVersion ? `&engineVersion=${engineVersion}` : ""}${includeUnknown ? "" : "&includeUnknown=1"}${
              includeNullEvalTf ? "&includeNullEvalTf=1" : ""
            }`}
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {includeUnknown ? "Unknown ausblenden" : "Unknown einblenden"}
          </Link>
          <Link
            href={`/${locale}/admin/outcomes/engine-health?days=${days}${assetId ? `&assetId=${assetId}` : ""}${
              playbookId ? `&playbookId=${playbookId}` : ""
            }${engineVersion ? `&engineVersion=${engineVersion}` : ""}${includeUnknown ? "&includeUnknown=1" : ""}${
              includeNullEvalTf ? "" : "&includeNullEvalTf=1"
            }`}
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {includeNullEvalTf ? "Eval-TF leer ausblenden" : "Eval-TF leer einblenden"}
          </Link>
        </div>
      </header>

      <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900">
            <tr>
              {[
                "Playbook",
                "Engine",
                "Eval TF",
                "Total",
                "Closed",
                "TP",
                "SL",
                "Expired",
                "Ambig",
                "Invalid",
                "HitRate",
                "ExpiryRate",
                "Coverage",
                "Samples",
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row, idx) => {
              const closed = row.hit_tp + row.hit_sl + row.expired + row.ambiguous;
              return (
                <tr key={`${row.playbookId ?? "unknown"}-${row.setupEngineVersion ?? "unknown"}-${idx}`}>
                  <td className="px-3 py-2 font-semibold text-white">{row.playbookId ?? "unknown"}</td>
                  <td className="px-3 py-2 text-slate-300">{row.setupEngineVersion ?? "n/a"}</td>
                  <td className="px-3 py-2 text-slate-300">{row.evaluationTimeframe ?? "-"}</td>
                  <td className="px-3 py-2">{row.total}</td>
                  <td className="px-3 py-2">{closed}</td>
                  <td className="px-3 py-2">{row.hit_tp}</td>
                  <td className="px-3 py-2">{row.hit_sl}</td>
                  <td className="px-3 py-2">{row.expired}</td>
                  <td className="px-3 py-2">{row.ambiguous}</td>
                  <td className="px-3 py-2">{row.invalid}</td>
                  <td className="px-3 py-2">{row.winRate != null ? `${(row.winRate * 100).toFixed(1)}%` : "-"}</td>
                  <td className="px-3 py-2">
                    {row.expiryRate != null ? `${(row.expiryRate * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {row.coverage != null ? `${(row.coverage * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {row.samples.length ? (
                      <div className="flex flex-wrap gap-1">
                        {row.samples.map((id) => (
                          <span
                            key={id}
                            className="rounded bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-200"
                            title={id}
                          >
                            {id.slice(0, 6)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={12}>
                  Keine Daten f\u00fcr die aktuellen Filter (cohort aktiv).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
