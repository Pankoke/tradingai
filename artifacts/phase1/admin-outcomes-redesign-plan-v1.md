## Admin Outcomes Redesign Plan (v1) — Analyse & Roadmap (keine Umsetzung)

### 1) IST-Inventar (Stand Repo)
- **Seiten/Routes (admin):**
  - `/admin/outcomes` (src/app/[locale]/admin/(panel)/outcomes/page.tsx) – zeigt Grade-bucket KPIs, Winrate, Top NO_TRADE reasons, 10 recent outcomes. Datenquelle: `loadOutcomeStats` (src/server/admin/outcomeService.ts) → DB (`setup_outcomes`) mit Filtern: profile=SWING, timeframe=1D, limit=300, excludes invalid. Playbook-Chips waren statisch, jetzt dynamisch aus `availablePlaybooks`.
  - `/admin/outcomes/engine-health` (src/app/[locale]/admin/(panel)/outcomes/engine-health) – nutzt `loadEngineHealth` aus outcomeService (aggregateOutcomes).
  - `/admin/outcomes/readiness` (Phase-1.2 readiness): liest Artefakt `swing-outcome-analysis-latest-v1.json`.
  - `/admin/outcomes/swing-performance` (neu, artefakt-first): liest `swing-performance-breakdown-latest-v1.json`, aggregiert Playbook/Asset.
  - Weitere Admin: playbooks/calibration, thresholds, monitoring/reports (Phase0), etc. (siehe build).
- **Datenquellen:**
  - DB: `setup_outcomes` (Outcome Status), `perception_snapshots` (setups JSON), `perception_snapshot_items` (scores/meta).
  - Artefakte: Phase1 Scripts unter `artifacts/phase1/` (join-stats, swing-outcome-analysis, swing-performance-breakdown).
- **Filter/Tables heute:**
  - `/admin/outcomes`: days chip, playbook chip, grade-bucket breakdown, Winrate (TP vs SL), expired/ambiguous, sample count (cohort length), Top NO_TRADE reasons, recent table (10 rows).
  - `/admin/outcomes/swing-performance`: Filters timeframe/playbook/hideLowSample, Tables by Playbook/Asset mit counts/closeRate/winrateTpSl.

### 2) SOLL-Struktur
- **Outcomes (Admin) — drei Perspektiven:**
  - **Overview (artefakt-first)**: Gesamtdatenfenster (30/60 Tage) aus `swing-performance-breakdown-latest`. KPIs: outcomesTotal, closed/open, closeRate, winrateTpSl. Tabellen: By Playbook, By Asset. Flags: tooFewClosed/mostlyOpen.
  - **Explorer (live DB)**: Detail-Tabelle mit Filtern (days, asset, playbook, grade, status). Nutzt `listOutcomesForWindow`/`aggregateOutcomes`, evtl. Paginierung. Ziel: Sampling-Verständnis; Sample count sollte alle Outcomes im Fenster umfassen (nicht nur A/B).
  - **Diagnostics (artefakt/DB)**: zeigt Filter/Params, rowsConsidered, Status-Mix, ggf. Outcome evaluate window/limit. Dev-Only Debug-Panel mit query params und SQL-ähnlicher Beschreibung.
- **Playbooks Overview (optional neue Seite)**:
  - Tabelle pro playbook_id (Swing): outcomesTotal, closedCount, closeRate, tp, sl, winrateTpSl, openCount, flags (tooFewClosed/mostlyOpen).
  - Filter: timeframe (1D/1W), label (default alle), minClosed toggle, include generic (legacy) toggle.
  - Datenquelle: bevorzugt Artefakt `swing-performance-breakdown-latest`; optional Live-Query-Backup (aggregateOutcomes grouped by playbook_id).

### 3) Technischer Plan (Iterationen)
- **Iteration 1 (artefakt-first, minimal UI)**:
  - Outcomes Overview Page: lesen `swing-performance-breakdown-latest-v1.json`; Re-use Komponenten aus swing-performance-Seite; Surfacing KPIs + Flags.
  - Playbooks Overview (wenn separat): simple Tabelle aus Artefakt (group by playbook_id) mit Filter timeframes/labels/playbook toggle.
  - Fehlerfall: Artefakt fehlt → Hinweis + Command `npm run phase1:performance:swing -- --days=30`.
- **Iteration 2 (optional Live/Cache)**:
  - Backend Endpoint `/api/admin/outcomes/swing-performance` erzeugt/liest Artefakt, optional Regenerate-Button.
  - Live Explorer: server action/service mit Paginierung, Status-Filter, grade/noTrade toggles; Samples-Count aus DB statt limit=300.
- **Iteration 3 (Drilldowns)**:
  - Playbook → Asset → Setup → Outcome Drilldown (links zwischen tables).
  - Outcome detail: snapshotId/setupId, status, evaluatedAt, barsToOutcome, reasons, setup payload excerpts.

### 4) Risiken / Abhängigkeiten
- Viele Outcomes `open` → Winrate n/a, closeRate niedrig. Ursache: Outcome-Evaluate cron (daily, limit 500) siehe `.github/workflows/outcomes-evaluate.yml`. Mehr closed erfordert häufigere Runs/ höheres Limit.
- Artefakt-Basis: staleness möglich; sicherstellen, dass latest Artefakt regelmäßig erzeugt wird (Phase1 Scripts).
- DB-Explorer muss auf Profil/TF/Label filtern (SWING, 1D/1W, labels eod/us_open/morning/(null)) — sonst Inkonsistenzen zu Artefakten.

### 5) Nächste Build-Prompts (ohne Umsetzung hier)
- **Prompt A (Outcomes Overview aus Artefakt):** Neue Admin-Route, liest `swing-performance-breakdown-latest`, zeigt KPIs/Tabellen/Flags, Filter timeframe/playbook/hideLowSample.
- **Prompt B (Playbooks Overview):** Tabelle pro playbook_id mit Swing-Statusmix, Filter (TF/Label/MinClosed), generic optional als legacy.
