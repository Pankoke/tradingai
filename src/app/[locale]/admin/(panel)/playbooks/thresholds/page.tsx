import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadGoldThresholdRecommendations } from "@/src/server/admin/playbookThresholdService";
import { loadGoldThresholdSuggestions } from "@/src/server/admin/playbookThresholdSuggestions";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ days?: string; includeOpen?: string }>;
};

const ALLOWED_DAYS = ["30", "60", "90"];

export default async function ThresholdsPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 90;
  const includeOpen = query.includeOpen === "1";
  const rec = await loadGoldThresholdRecommendations({ days, includeOpen });
  const suggestions = await loadGoldThresholdSuggestions({ days, percentile: 0.7 });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Playbook Thresholds (Gold Swing)</h1>
        <p className="text-sm text-slate-300">
          Read-only Vorschläge aus Outcomes & Snapshots (letzte {days} Tage). Aktive Playbook-Logik bleibt unverändert.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/playbooks/thresholds?days=${value}${includeOpen ? "&includeOpen=1" : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <Link
            href={`/api/admin/playbooks/thresholds/export?format=json&days=${days}`}
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            Export JSON
          </Link>
          <Link
            href={`/api/admin/playbooks/thresholds/export?format=csv&days=${days}`}
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            Export CSV
          </Link>
        </div>
      </header>

      {rec.insufficientData ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          Keine ausreichenden Daten (benötigt mind. 30 abgeschlossene Outcomes). Tipp: Beobachtungszeitraum erweitern.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Aktuelle Schwellen">
            <ThresholdList thresholds={rec.current} />
          </Card>
          <Card title="Empfohlene Schwellen">
            <ThresholdList thresholds={rec.recommended ?? rec.current} deltas={rec.deltas} />
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Outcome Split (WinRate)">
          <div className="space-y-2 text-sm text-slate-200">
            {Object.entries(rec.byGrade).map(([grade, bucket]) => (
              <div key={grade} className="rounded bg-slate-900/60 px-3 py-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Grade {grade}</span>
                  <span>{bucket.winRate !== null ? `${Math.round(bucket.winRate * 100)}%` : "-"}</span>
                </div>
                <div className="text-xs text-slate-400">
                  TP {bucket.hit_tp} | SL {bucket.hit_sl} | Exp {bucket.expired} | Amb {bucket.ambiguous} | Open{" "}
                  {bucket.open}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Sensitivität SQ-Min">
          <div className="space-y-2 text-sm text-slate-200">
            {rec.sensitivity.map((p) => (
              <div key={p.sqMin} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                <span>SQ ≥ {p.sqMin}</span>
                <span>
                  {p.winRate !== null ? `${Math.round(p.winRate * 100)}%` : "-"} (n={p.samples})
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Calibration Suggestions (read-only)">
        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
          {["30", "90", "180", "365", "730"].map((value) => (
            <span
              key={value}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </span>
          ))}
        </div>
        <div className="mt-3 text-sm text-slate-200">
          <div className="mb-3 rounded bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
            Heuristische, read-only Vorschläge basierend auf Outcomes. Aktive Playbook-Logik bleibt unverändert.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white">Top NO_TRADE Gründe</h3>
              {suggestions.topNoTradeReasons.map((r) => (
                <div key={r.key} className="rounded bg-slate-900/60 px-3 py-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold capitalize">{r.label}</span>
                    <span>{r.count} ({Math.round(r.share * 100)}%)</span>
                  </div>
                  {r.examples.length ? (
                    <div className="mt-1 text-[11px] text-slate-400">{r.examples.join(" | ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white">Suggested threshold relaxations</h3>
              {suggestions.suggestions.map((s) => (
                <div key={`${s.metric}-${s.reasonKey}`} className="rounded bg-slate-900/60 px-3 py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold">{s.metric}</span>
                    <span>
                      {s.currentThreshold ?? "?"} → {s.suggestedThreshold} (n={s.sampleSize}, unlock {s.wouldUnlockCount})
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Dist P70:{s.distribution.p70 ?? "-"} | P80:{s.distribution.p80 ?? "-"} | P90:{s.distribution.p90 ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Link
              href={`/api/admin/playbooks/thresholds/suggestions?days=${days}&percentile=0.7`}
              className="text-xs text-blue-300 underline"
            >
              Export JSON Suggestions
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ThresholdList({ thresholds, deltas }: { thresholds: Record<string, number>; deltas?: Record<string, number> }) {
  return (
    <div className="space-y-2 text-sm text-slate-200">
      {Object.entries(thresholds).map(([key, value]) => (
        <div key={key} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
          <span className="capitalize">{key}</span>
          <span className="font-semibold">
            {value}
            {deltas && typeof deltas[key] === "number" && deltas[key] !== 0 ? (
              <span className="text-xs text-slate-400"> ({deltas[key] > 0 ? "+" : ""}{deltas[key]})</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
