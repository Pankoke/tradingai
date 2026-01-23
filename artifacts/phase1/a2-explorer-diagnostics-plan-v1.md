# A2 Explorer / Diagnostics Plan (analysis only, no code changes)

## IST-Inventar (belegt)
- Outcomes DB-Seite: `src/app/[locale]/admin/(panel)/outcomes/page.tsx`
  - Server component lädt `loadOutcomeStats` (siehe `src/server/admin/outcomeService.ts`).
  - Filter/Query-Params: `days`, `assetId`, `playbookId`, `showNoTradeType`. Allowed days: 7/30/90/180/365/730.
  - UI-KPIs: Win-Rate nur aus Grade A/B (handelbare Setups), NO_TRADE bewusst gefiltert.
  - CSV Export Buttons: `OutcomesExportButtons` (gleiche Datenquelle).
- Outcome-Service: `src/server/admin/outcomeService.ts`
  - Datenquelle: `listOutcomesForWindow` aus `setupOutcomeRepository`.
  - Profil hart: `profile: "SWING"`, `timeframe: "1D"`, limit 300 (cohort filter `cohortFromSnapshot` vs FIX_DATE).
  - Nur Status `!= invalid` im cohort; winRate = hit_tp / (hit_tp+hit_sl).
  - Playbook-Filterchips basieren auf `availablePlaybooks` aus den geladenen rows.
- Engine Health & Swing Performance (artefakt-first):
  - Neue Artefakt-Seiten: `/admin/outcomes/overview` (artefakt) und `/admin/playbooks` (artefakt).
  - Datenquelle: `artifacts/phase1/swing-outcome-analysis-latest-v2|v1.json`.
- Diagnostics/Join Scripts:
  - join-stats: `scripts/phase1/join-stats.ts` (artefakt-first, no DB UI).
  - Outcome backfill/evaluate endpoints: `/api/cron/outcomes/backfill`, `/api/cron/outcomes/evaluate` (per update-pipeline-audit-v1.md).

## SOLL-Struktur (Zielbild)
- Outcomes Explorer (DB-driven, live):
  - Zweck: Drilldown/Liste der zuletzt bewerteten Outcomes aus DB, mit klaren Filtern und Sample-Zahlen.
  - Klarer Hinweis: “Handelbare A/B only” vs “alle Grades/NO_TRADE”.
  - Filters: days, assetId, playbookId, grade toggle (A/B vs all), includeInvalid, includeNoTrade.
  - KPIs: totals (tp/sl/open/expired/ambiguous), winrate (tp/(tp+sl)), closeRate, sampleCount (rows considered).
- Diagnostics (artefakt-first or API-light):
  - Zweck: Plausibilität/Health-Checks der Pipeline (Join-Rate, Missing Dimensions, Mostly Open).
  - Quelle: join-stats artefakt + outcome analysis artefakt.
  - KPIs: joinRate, unmatched count, missing playbook/decision/grade, fallbackUsedCount, open share.
  - Actions/Links: outcomes backfill/evaluate endpoints (curl), recompute-decisions doc.

## Strukturvorschlag A2
- Navigator (panel) unter Outcomes:
  - Outcomes Overview (artefakt, fertig) – behält Überblick.
  - Outcomes Explorer (bestehende DB-Seite, umbenennen/aufräumen).
  - Diagnostics (neu, artefakt-first; liest join-stats + outcome analysis).
- Explorer Quickwins:
  - Klarer Text: “Grade A/B only” + Toggle “Include NO_TRADE/All grades”.
  - Filter-Chips: days, assetId, playbookId; optional toggle “Show Invalid/Open”.
  - Sample-Zahl muss Gesamtanzahl der geladenen rows zeigen (cohort length), nicht nur A/B wenn toggled off.
  - Sortierbare Tabelle “recent” (bereits vorhanden), ggf. Anzeige rowsConsidered aus debug.
  - Playbook-Chips: statt statisch sollten distinct playbookIds aus `stats.availablePlaybooks` (bereits so), aber optional Schnittmenge mit Registry, damit Metals/Energy/FX Playbooks auftauchen falls DB sie enthält.
- Diagnostics Seite (artefakt-first, Schritt A2.2):
  - Quelle: `artifacts/phase1/join-stats-latest-v1.json` + `swing-outcome-analysis-latest-v2|v1.json`.
  - Anzeigen: joinRate, snapshotsInWindow, unmatchedOutcomes, missing dims, fallbackUsedCount, open share.
  - Tabellen: by asset/timeframe/label (joinRate, setups, outcomes); reasons for unmatched (falls im artefakt).
  - Hinweise: “Run join-stats via npm run phase1:join-stats -- --days=30”.

## Iterativer Build-Plan
- A2.1 (klein): Outcomes DB-Seite umbenennen zu “Outcomes Explorer”, Klartext-Hinweis für A/B-only, Sample-Zahl = cohort length, Chips generiert aus `stats.availablePlaybooks` (keine harten Listen).
- A2.2: Neue Diagnostics-Seite (artefakt-first) unter `/admin/outcomes/diagnostics`, liest join-stats + outcome-analysis artefakte, zeigt Health KPIs + curl-Hinweise für backfill/evaluate.
- A2.3: Optionale UX Verbesserungen (CSV Download klar beschriften: “A/B only”, Pagination/Limit adjustable), optional toggle “include invalid/open”.

## Risiken / Abhängigkeiten
- Viele OPEN Outcomes → winrate n/a ist korrekt; Explorer sollte das klar beschreiben.
- Outcome evaluate/backfill Frequenz (siehe `artifacts/ops/update-pipeline-audit-v1.md`) beeinflusst Datenfrische.
- Registry vs DB: Wenn Playbooks neu, aber DB alt → Chips evtl. unvollständig; Explorer sollte zeigen, was DB tatsächlich liefert (nicht “alle geplanten”).

## Nächste Build-Prompts (nicht umgesetzt)
- Prompt A: “Umbennen Outcomes DB-Seite zu Explorer + Text/Toggle A/B vs all grades, SampleCount fix”.
- Prompt B: “Diagnostics Seite aus join-stats + outcome-analysis artefakten rendern”.
