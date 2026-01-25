# TradingAI – Full Project Review (2026-01-24)

---

## 1. Executive Summary

- Staerke: Klarer Engine-Kern mit Playbook-Evaluationslogik und gut nachvollziehbaren Gates in `src/lib/engine/playbooks/index.ts`.
- Staerke: Durchgaengige Snapshot- und Outcome-Pipeline mit Persistierung und Auswertung (`src/features/perception/build/buildSetups.ts`, `src/server/services/outcomeEvaluationRunner.ts`).
- Staerke: Solide Monitoring-Basis via Phase0-Endpoint + Weekly Report Automation (API `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`, Script `scripts/build-weekly-health-report.ts`, Workflow `.github/workflows/phase0-monitor.yml`).
- Staerke: Umfangreiche Testbasis fuer Kernlogik, Playbooks, Phase0 und Outcomes (`tests/**`).
- Staerke: Datenqualitaets-Gates (Freshness, event modifier, ring meta) reduzieren fehlerhafte Signale (`src/server/health/freshnessGate.ts`, `src/lib/engine/perceptionEngine.ts`).
- Risiko: Entscheidungslogik ist verteilt (Playbook-Grade, Decision-Layer, Phase0-Auswertung, UI), Drift-Risiko hoch.
- Risiko: Playbook-Resolution basiert stark auf Symbol-Heuristiken, damit hohes Risiko fuer falsche Zuordnung bei neuen Assets.
- Risiko: JSONB-Snapshots + separate SnapshotItems + Outcomes fuehren zu doppelten Wahrheiten und teuren Queries.
- Risiko: Phase0-Report ist fest an einen Endpoint gebunden; Aenderungen an dessen Payload brechen Automatisierung und Admin-Monitoring.
- Risiko: CI ist nicht durchgaengig fuer Tests/Lint verdrahtet; Regressionen koennen unbemerkt in main gelangen.
- Naechste Schritte (3): 1) Entscheidungssystem konsolidieren und eine SoT definieren, 2) Playbook-Registry + Asset-Metadaten als Kanon etablieren, 3) Monitoring auf WoW-Trends + Alerts + Mindest-Samples erweitern.

---

## 2. Architektur-Ueberblick (IST-Zustand)

### 2.1 High-Level Systemuebersicht
- Textdiagramm:

```
[Next.js App Router]
  |-- UI (Premium, Admin, Monitoring)
  |     - src/app/[locale]/...
  |-- API Routes
  |     - src/app/api/*
  |-- Engine
  |     - src/lib/engine/*
  |-- Decision Layer
  |     - src/lib/decision/*
  |-- Admin Services
  |     - src/server/admin/*
  |-- Data Access (Repositories)
  |     - src/server/repositories/*
  |-- DB (Drizzle, Postgres)
  |     - src/server/db/schema/*
  |-- Automation
        - .github/workflows/*
        - scripts/*
```

- Trennung: Engine (Signal-/Playbook-Logik), UI (Premium/Admin/Monitoring), Admin/Reporting (Admin-Services, Scripts), Automation (Cron + GitHub Actions), DB Layer (Repositories + Drizzle Schema).

### 2.2 Zentrale Request-Flows
- Premium Setup Rendering:
  1) UI-Seite (z.B. `src/app/[locale]/setups/page.tsx` oder Premium-Perception `src/app/[locale]/premium/perception/page.tsx`) requested Daten.
  2) API `src/app/api/setups/today/route.ts` oder Server-Komponente ruft Snapshot Store (`src/features/perception/cache/snapshotStore.ts`).
  3) Snapshot Store liest `perception_snapshots` + `perception_snapshot_items` (`src/server/repositories/perceptionSnapshotRepository.ts`).
  4) UI rendert Setups, Ring-Explainer und Metadaten.

- Admin Outcomes & Phase0:
  1) Admin UI (`src/app/[locale]/admin/(panel)/outcomes/*`) fragt Statistik/Exports an.
  2) API `src/app/api/admin/outcomes/export/route.ts` ruft `src/server/admin/outcomeService.ts`.
  3) OutcomeService aggregiert/vereinigt Snapshot- und Outcome-Daten (`src/server/repositories/setupOutcomeRepository.ts`, `perceptionSnapshotRepository.ts`).
  4) Phase0-Analyse via `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` (DB Snapshot JSONB + Outcomes) liefert Monitoring-Payload.

- Weekly Health Report (Workflow -> Script -> Commit -> Admin UI):
  1) GitHub Action `.github/workflows/phase0-monitor.yml` ruft Phase0-Endpoints fuer Gold/BTC.
  2) Script `scripts/build-weekly-health-report.ts` rendert Markdown und speichert in `reports/weekly/`.
  3) Action committet die Datei nach main.
  4) Admin Monitoring liest Dateisystem und rendert report (`src/app/[locale]/admin/(panel)/monitoring/reports/*`).

- Cron/Automation Flows:
  - Cron API (z.B. `src/app/api/cron/perception/route.ts`, `src/app/api/cron/outcomes/evaluate/route.ts`) wird via GitHub Workflows getriggert.
  - Freshness Gates (`src/server/health/freshnessGate.ts`) entscheiden, ob Processing startet.
  - Snapshot Build nutzt `src/server/perception/snapshotBuildService.ts` mit DB Advisory Lock.

### 2.3 Datenfluesse
- Candle Data -> Metrics -> Setups -> Snapshots -> Outcomes -> Reports:
  - Candles: `src/server/db/schema/candles.ts` + Providers `src/server/marketData/*`.
  - Metrics/Signals: `src/lib/engine/marketMetrics.ts`, `src/lib/engine/orderflowMetrics.ts`, `src/lib/engine/sentimentMetrics.ts`.
  - Setups: `src/lib/engine/perceptionDataSource.ts` (Live/MOCK), `src/lib/engine/perceptionEngine.ts`.
  - Snapshots: `perception_snapshots` (JSONB) + `perception_snapshot_items` (normalized items).
  - Outcomes: `src/server/services/outcomeEvaluationRunner.ts`, `src/server/db/schema/setupOutcomes.ts`.
  - Reports: Weekly Markdown + Admin UI.
- Entscheidungen einfrieren:
  - Playbook-Grade und Decision werden in Snapshot-JSONB persistiert (`src/features/perception/build/buildSetups.ts`).
  - Outcome-Evaluation nutzt persisted Snapshot-Data als Basis, keine Neuberechnung.
  - Phase0-Analyse re-deriviert Decision/Signal-Qualitaet fuer Monitoring -> Drift-Potential.

---

## 3. Setup-, Grade- & Decision-System (KERN)

### 3.1 Aktuelles Modell
- setupGrade: A/B/NO_TRADE aus Playbook-Evaluation (`src/lib/engine/playbooks/index.ts`).
- setupDecision: TRADE/WATCH/BLOCKED aus Decision-Layer (`src/lib/decision/setupDecision.ts`).
- WATCH-Segmente & Upgrade-Kandidaten:
  - Gold WATCH+ Logik: `src/lib/decision/watchPlus.ts`.
  - SPX/FX WATCH Segmente: `src/lib/decision/spxWatchSegment.ts`, `src/lib/decision/fxWatchSegment.ts`.
- Regime / Confirmation / Alignment / Event Gates:
  - Regime Tag: `src/lib/engine/metrics/regime.ts`.
  - Confirmation/Orderflow: `src/lib/engine/orderflowMetrics.ts` + Playbook-Checks.
  - Alignment (FX): `src/lib/decision/fxAlignment.ts`.
  - Event Gates: Event modifier + event scoring (`src/lib/engine/modules/eventModifier.ts`).

### 3.2 Bewertung
- Saubere Trennung: Playbooks kapseln SetupGrade-Logik, Decision-Layer normalisiert in TRADE/WATCH/BLOCKED.
- Doppelte Entscheidungslogik:
  - Playbooks erzeugen Grade, Decision-Layer mappingt in Decision.
  - Phase0-Endpoint rechnet eigene Watch-Segmente, Alignment-Mapping und Gate-Logik (`src/app/api/admin/playbooks/phase0-gold-swing/route.ts`).
  - UI teils eigene Segment- oder Decision-Interpretation.
- Gefahr von Heuristik-Drift:
  - Watch-Logik fuer Index/Crypto/FX mehrfach definiert (Playbook vs Decision vs Phase0).
  - Symbolbasierte Asset-Erkennung kann sich von Asset-DB entkoppeln.

### 3.3 Empfehlung
- Single Source of Truth: Decision + Playbook Evaluation in `src/lib/engine/playbooks/index.ts` + `src/lib/decision/setupDecision.ts`, persistiert im Snapshot.
- Stabilisierung:
  - Zentraler Decision-Resolver als Service, der von API, Phase0 und UI genutzt wird (z.B. `src/server/services/decisionResolver.ts`).
  - Phase0-Endpoint soll nur Snapshot-Daten lesen und keine eigenen Regeln enthalten; sonst Drift.
  - Klare Versionierung der Decision-Outputs (z.B. `decisionVersion` in Snapshot JSONB).

---

## 4. Playbooks & Engine-Design

### 4.1 Playbook-Struktur heute
- Gold Swing: harte Gates fuer Bias/Trend/SQ/Levels/Events und B-Grade Downgrade (`src/lib/engine/playbooks/index.ts`).
- Crypto Swing (BTC): regime- und confirmation-basierte Watch/No-Trade-Logik, Alignment-Fallback.
- Gemeinsame Regeln: Default-Playbook (Index/FX/Generic) nutzt vereinfachte Bias/Trend-Logik.
- Asset Routing ueber heuristische Match-Funktionen (Symbols/Ids) in `src/lib/engine/playbooks/index.ts`.

### 4.2 Gate-Design
- Bias/Trend/SignalQuality/Confidence: harte Schwellen in Playbook-Logik.
- Orderflow/Confirmation: orderflowScore und Flags im Playbook.
- Event/Regime: event modifier + regime tags bestimmen harte oder weiche Gates.
- Hard vs Soft:
  - Hard: fehlende Levels, Execution-critical Events, harte Konflikte.
  - Soft: Bias/Trend/SQ/Confidence unter Grenzwert -> WATCH.
- WATCH vs BLOCKED: im Decision-Layer basierend auf Keywords/Heuristiken (`src/lib/config/watchDecision.ts`).

### 4.3 Erweiterbarkeit
- Positiv: Playbook-Resolver trennt Asset-Identifikation von Playbook-Evaluation.
- Risiken:
  - Heuristische Symbol-Regeln (z.B. Index-Erkennung, FX-Regex) sind fragile Annahmen.
  - Sonderfaelle (WTI/Silver) werden im Build-Flow gefixt (`src/features/perception/build/buildSetups.ts`).
  - Neue Assets koennen falsches Playbook bekommen, wenn ID/Symbol nicht passt.

### 4.4 Empfehlung
- Einheitliches Playbook-Interface:
  - Ein gemeinsames Interface fuer Evaluation (Inputs: rings, levels, event modifier, regime) und Output (grade, reasons, debug).
  - Asset-zu-Playbook-Zuordnung ueber DB/Config, nicht ueber heuristische Symbol-Strings.
- Minimal-Requirements fuer neue Asset-Klassen:
  - Pflichtsignale: Bias, Trend, SignalQuality, Confidence, Regime, EventContext, Levels.
  - Standard-Gates: Bias>=70, Trend>=50, SQ>=55, Confidence>=55, Levels valid.
  - WATCH-Segmentierung: Default-Segmente (fails_bias, fails_trend, fails_sq, fails_confidence, fails_regime).
  - Gate-Lockerung erst nach Monitoring-Performance (z.B. >30 Samples, Winrate >55%).

---

## 5. Monitoring & Reporting (Phase0 & Weekly Health)

### 5.1 Phase0 Endpoint
- Endpoint: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`.
- Parameter: daysBack, dedupeBy (snapshotId/setupId), windowField (evaluatedAt/createdAt/outcomeAt).
- Features:
  - snapshotId/setupId Matching.
  - debugMeta: Watch-Segmente, Bias-Histogramm, Alignment-Counters.
  - asset-spezifische Diagnostik (BTC-Regime, Volatility Buckets).

### 5.2 Weekly Health Report Pipeline
- GitHub Action: `.github/workflows/phase0-monitor.yml` (weekly).
- Script: `scripts/build-weekly-health-report.ts` rendert Markdown basierend auf Phase0 JSON.
- Commit & Admin Rendering: Report wird committed und im Admin UI gelistet (`src/app/[locale]/admin/(panel)/monitoring/reports/*`).
- Markdown-Sicherheit: Rendert aus lokalen Dateien; keine externe Markdown-Quellen.

### 5.3 Bewertung
- Aussagekraft: gute Verteilungssichten (Decisions, Segmente, Outcomes), aber baseline/Trends fehlen.
- Regression-Erkennung: aktuell implizit (Alerts im Report), keine automatischen Schwellwert-Alerts.
- Risiken: Aenderungen am Phase0-Payload brechen Script und Admin UI ohne Tests/Contract.

### 5.4 Empfehlungen
- Alerts und WoW-Trends: Metriken diffen (z.B. trade share, watch winrate) und abweichungen markieren.
- Mindest-Sample-Groessen: Report sollte pro Abschnitt die Sample Size ausweisen und warnen, wenn <N.
- Monitoring fuer neue Assets: asset-agnostische Summary + per-asset Templates.
- Stabiler API-Vertrag: JSON-Schema fuer Phase0 Payload + Test in `tests/phase0`.

---

## 6. Admin UI & UX

- Informationsarchitektur: klar getrennte Bereiche (Assets, Events, Monitoring, Outcomes, Playbooks).
- Auffindbarkeit: Monitoring Reports leicht auffindbar; Outcomes-Bereiche sind sehr datenreich aber auf mehrere Tabs verteilt.
- Trennung Debug vs Produktiv: Admin ist in Production standardmaessig disabled (`src/lib/admin/security.ts`), Debug-Info nur non-prod.
- Performance/SSR/Markdown: Reports werden serverseitig aus dem Dateisystem geladen; fuer grosse Report-Mengen kann Paginating sinnvoll sein.

Empfehlungen (priorisiert):
1) Outcomes-UI konsolidieren: ein zentrales Summary mit Links zu Diagnostics/Export; klare Filter-Defaults.
2) Report-Index mit Pagination/Filter (Datum, Asset) fuer wachsende Reports.
3) Admin-Access-Policy dokumentieren (Prod disabled) und klare Notfall-Procedure definieren.

---

## 7. Datenmodell & Persistenz

- Tables: perceptionSnapshots (JSONB), perceptionSnapshotItems (normalized), outcomes, candles.
- Query-Risiken:
  - JSONB Setups in `perception_snapshots` fuehren zu grossen Payloads und erschweren selektive Queries.
  - SnapshotItems und Snapshot JSONB koennen divergieren (double truth).
- Join-Risiken:
  - Outcomes referenzieren setupId + snapshotId, aber Setup-Daten liegen in JSONB; keine FK zu einer Setup-Tabelle.
- Canonicalization:
  - assetId/timeframe werden teils aus symbol heuristics abgeleitet; Risiko fuer inkonsistente IDs.
- Langfristige Wartbarkeit:
  - Langfristig sollte ein dediziertes Setup-Table existieren, um Snapshots normalisiert zu halten.

Empfehlungen:
- Klare Canonicalization von assetId/timeframe in `src/server/repositories/assetRepository.ts` + enforced mapping.
- Reduziere JSONB-Duplikate: SnapshotItems als SoT fuer Auswertungen, JSONB als Cache.
- FKs und Constraints fuer Outcomes (snapshotId/setupId) ergaenzen.

---

## 8. Security, Ops & Automation

- Admin Guards: Session/Cookie checks (`src/lib/admin/guards.ts`) + rate limiting (`src/lib/admin/security.ts`).
- Cron Guards: `CRON_SECRET` in allen Cron-Endpoints erforderlich.
- GitHub Actions Permissions: `contents: write` fuer Report-Commit.
- Secrets Handling: CRON_SECRET + BASE_URL in GHA Secrets.
- Fehler- & Retry-Strategien: Cron Routes loggen auditRuns; Snapshot Build nutzt advisory lock.

Risiken:
- Admin UI in Prod deaktiviert -> eingeschraenkte Incident-Response.
- Cron Secrets Single Point of Failure (keine Rotation/Versionierung erkennbar).
- Einige Admin API Routes akzeptieren Cron Secret als Auth (hohe Macht).

Empfehlungen:
- Secrets Rotation Policy + minimale Permissions pro Endpoint.
- Audit logging fuer Admin-API Calls (nicht nur Cron).
- Optionaler admin read-only mode fuer Production.

---

## 9. Performance & Reliability

- Hot Paths:
  - Snapshot Build: heavy loops + API/DB access (`src/lib/engine/perceptionDataSource.ts`).
  - Phase0 Endpoint: scannt Snapshot JSONB ueber Window -> O(n) pro Snapshot.
  - Outcome Evaluation: paginiert, aber operiert auf Snapshots + Candle Lookups.
- Batch vs Einzelabfragen:
  - Per-asset candle fetches koennen N+1 erzeugen; teilweise parallelisiert via Promise.all.
- Caching-Potential:
  - Rings/Scores pro Setup koennen cachebar sein; aktuell werden mehrere Male berechnet (Build vs Phase0).
- Failure Modes:
  - Provider-Ausfaelle (marketdata/sentiment) -> fallback scoring.
  - Partial Data / Stale candles -> freshnessGate blockiert Cron, aber nicht UI.
  - Race Conditions: Snapshot Build lock loest Multi-Run, gut.

Empfehlungen:
- Materialisierte Views oder aggregated tables fuer Phase0/Outcomes.
- Guardrails fuer JSONB size und snapshot retention policy.
- Observability: metrics fuer snapshot build duration, provider error rate.

---

## 10. Code Quality & Tooling

- TypeScript: stark typisiert in Engine und DB schema; Zod zur Validierung.
- Tests: breite Coverage (engine, decision, phase0, outcomes, routes) in `tests/**`.
- Fehlende Tests (kritisch): End-to-end Flows ueber Cron -> Snapshot -> Outcomes -> Report fehlen als Integrationstest.
- CI / Lint / Build Safety: Lint/Test Scripts vorhanden, aber keine CI-Workflow fuer PR/Push erkennbar.

Empfehlungen:
- CI Workflow fuer `npm test` + `npm run lint`.
- Contract Tests fuer Phase0 JSON Schema + Weekly Report.

---

## 11. Golden Path Check (PFLICHT)

1) Premium Setup (Engine -> Decision -> UI)
- Bruchstellen:
  - Snapshot fehlt oder veraltet -> UI zeigt leere Daten.
  - Decision-Derivation uneinheitlich (UI vs API vs Snapshot).
- Fehlende Sicherungen:
  - Kein klarer Indikator fuer stale snapshot in UI.
- Fruehindikator:
  - Snapshot age + total setups < threshold (z.B. <5) als Warnung.

2) Phase0 -> Weekly Report -> Admin Monitoring
- Bruchstellen:
  - Phase0 Endpoint Payload Aenderung ohne Script Update.
  - Cron Secret/BASE_URL falsch -> Report bleibt aus.
- Fehlende Sicherungen:
  - Kein Schema-Validation im Script.
- Fruehindikator:
  - Report-Generierung fails; Alert auf fehlenden Report in `reports/weekly`.

3) Outcomes Aggregation -> Admin Export
- Bruchstellen:
  - Outcome table ohne konsistente playbookId/timeframe (resolved vs stored).
  - Snapshot JSONB missing setups -> export incomplete.
- Fehlende Sicherungen:
  - Keine FK/Constraint zwischen outcomes und snapshots.
- Fruehindikator:
  - Export debug mode zeigt mismatch counts (countsByPlaybookId_totalInDb vs returned).

---

## 12. Risk Register (Top 10)

| Risiko | Beschreibung | Impact | Wahrscheinlichkeit | Mitigation |
| --- | --- | --- | --- | --- |
| Decision Drift | Logik mehrfach implementiert (Playbook, Decision, Phase0) | High | High | Decision SoT + shared resolver |
| Playbook Misrouting | Asset heuristics fuehren falsches Playbook | High | Medium | Playbook registry + asset metadata |
| JSONB Snapshot Bloat | grosse JSONB payloads belasten DB | Medium | High | Snapshot retention + normalize tables |
| Report Coupling | Weekly Report abhaengig von Phase0 Payload | Medium | Medium | JSON Schema + contract tests |
| Missing CI | Keine Tests in CI fuer PRs | High | Medium | CI workflow etablieren |
| Data Canonicalization | assetId/timeframe inkonsistent | Medium | Medium | enforce canonical mapping |
| Cron Secret Single Point | Token misuse/rotation fehlt | High | Low | rotation + scoped tokens |
| Provider Outage | marketdata/sentiment provider down | Medium | Medium | fallback + alerting |
| Outcome Coverage Gaps | outcomes limited window/limit | Medium | Medium | batch processing & coverage checks |
| Admin Disabled in Prod | fehlende Ops visibility | Medium | Medium | read-only admin mode |

---

## 13. Playbook Scalability Plan (SEHR WICHTIG)

Konzept fuer neue Assets/Asset-Klassen:
- Required Signals:
  - Bias, Trend, SignalQuality, Confidence, Regime, EventModifier, Levels.
- Default Gates:
  - Bias>=70, Trend>=50, SQ>=55, Confidence>=55, Levels valid, Event not execution_critical.
- WATCH-Segmentierung:
  - fails_bias, fails_trend, fails_regime, fails_confidence, fails_sq, fails_levels, event_risk.
- Monitoring-Metriken:
  - trade_share, watch_share, watch_winrate, expired_share, sample_count.
- Gate-Lockerung:
  - Nur wenn sample_count >= 30 und watch_winrate >= 55% (mindestens 3 Wochen stabil).

Asset-Beispiele:
- Neue Einzel-Assets (ETH, Silver): AssetRegistry-Entry + Playbook mapping + default gates.
- Neue Asset-Klassen (Indices, FX): neue Profile defaults (timeframes, event windows) + regime definition + watch segments.

---

## 14. Test Plan (Minimal, aber sinnvoll)

- Decision-Classification Tests: ensure deriveSetupDecision bleibt konsistent (Playbook vs Decision output).
- WATCH+/Upgrade Tests: Gold WATCH+ Candidate Cases.
- Phase0 Join Integrity: Snapshot->Outcome matching und dedupeBy correctness.
- Weekly Report Snapshot Tests: Schema contract + rendering snapshot.

---

## 15. Priorisierte Roadmap

| ID | Massnahme | Warum | Dateien | Prioritaet (P0–P2) | Aufwand (S/M/L) | Risiko |
| --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Decision SoT + shared resolver | Drift verhindern | `src/lib/decision/setupDecision.ts`, `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` | P0 | M | High |
| P0-2 | Playbook Registry in DB/Config | Fehlrouting verhindern | `src/lib/engine/playbooks/index.ts`, `src/server/repositories/assetRepository.ts` | P0 | M | High |
| P1-1 | Phase0 JSON Schema + contract tests | Reporting stabilisieren | `scripts/build-weekly-health-report.ts`, `tests/phase0/*` | P1 | S | Medium |
| P1-2 | CI Workflow fuer tests/lint | Regressionen vermeiden | `.github/workflows/*` | P1 | S | Medium |
| P1-3 | Snapshot retention + size guard | DB-Performance | `src/server/repositories/perceptionSnapshotRepository.ts` | P1 | M | Medium |
| P2-1 | Read-only Admin Mode in Prod | Ops Visibility | `src/lib/admin/security.ts`, `src/lib/admin/guards.ts` | P2 | M | Low |
| P2-2 | Aggregated outcomes tables | Performance | `src/server/repositories/setupOutcomeRepository.ts` | P2 | L | Medium |

---

## 16. Appendix

- Wichtige Dateien & Entry Points:
  - Engine: `src/lib/engine/perceptionEngine.ts`, `src/lib/engine/playbooks/index.ts`.
  - Decision: `src/lib/decision/setupDecision.ts`.
  - Snapshot Build: `src/features/perception/build/buildSetups.ts`, `src/server/perception/snapshotBuildService.ts`.
  - Outcomes: `src/server/services/outcomeEvaluationRunner.ts`, `src/server/admin/outcomeService.ts`.
  - Phase0 Monitoring: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`.
  - Weekly Report: `scripts/build-weekly-health-report.ts`, `.github/workflows/phase0-monitor.yml`.

- Where to look first (new devs):
  1) `src/lib/engine/perceptionEngine.ts` fuer Signal-Building.
  2) `src/lib/engine/playbooks/index.ts` fuer Regeln und Gates.
  3) `src/features/perception/build/buildSetups.ts` fuer Snapshot-Persistierung.
  4) `src/server/services/outcomeEvaluationRunner.ts` fuer Outcomes.
  5) `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` fuer Monitoring.
