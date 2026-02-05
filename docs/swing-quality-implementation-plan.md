# Swing-Quality Implementation Plan (SoT)
Stand: 2026-02-05 (Step 0, nur Dokumentation)

## Scope & Constraints
- Fokus: Swing Core (1D/1W) + optionales 4H-Refinement End-to-End (Marketdata → Outcomes) auf Basis bestehender Artefakte.
- Keine neuen Assets oder Backtest-Runs; nur Lesen/Auswertung vorhandener Daten.
- Shorts erlaubt; TypeScript-Änderungen später, strikt typisiert; heute nur Docs.
- Messbasis: vorhandene Reports/Artefakte, keine neuen Berechnungen.

## Pipeline Kurzbeschreibung (Marketdata → Perception → Engine → Playbook → Decision → Outcomes)
- **Marketdata**: Datenerhebung & Zeitfenster (Candle/Sentiment/Event Schedules) · siehe `docs/perception-pipeline.md` und Cron-Pläne in `docs/cron-schedules.md`.
- **Perception**: Snapshot-Bau (Bias/Sentiment/Orderflow/Event Scores) · Ablauf & Guardrails: `docs/perception-pipeline.md`, Setup-Generierung und Prüfschritte: `docs/setup-generation-audit.md`.
- **Engine**: Scoring/Confidence/SignalQuality/Drift/Volatilität · Entscheidungslogik beschrieben in `docs/decisions-v1.md`.
- **Playbook**: Resolver + Gate-Schwellen pro Asset/Class · Abdeckung & Lücken: `docs/playbook-coverage-report.md`.
- **Decision**: Trade/Watch/Blocked inkl. Ambiguous-Regeln · Details: `docs/decisions-v1.md`, `docs/cron-schedules.md` (Wann Entscheidungen gezogen werden).
- **Outcomes**: TP/SL/Expired/Ambiguous Evaluierung & Forward-Checks · Siehe `docs/outcomes-audit.md`, `docs/model-a-forward-outcomes.md`, plus Ergebnis-Samples in `docs/outcomes-audit.md`.

## Baseline-Metriken (nur bestehende Artefakte)
| Metrik | Wert | Quelle (Pfad → Abschnitt) | Anmerkung |
| --- | --- | --- | --- |
| winrate | 0.2073 | `artifacts/phase1/swing-outcome-analysis-latest-v2.md` → Abschnitt “Overall” | tp/(tp+sl), 663 Outcomes, 40 TP, 153 SL |
| outcomesTotal | 663 | `artifacts/phase1/swing-outcome-analysis-latest-v2.md` → Abschnitt “Overall” | Beobachtungsbasis 30 Tage, TF 1d/1w |
| tradeCount | 69 | `artifacts/phase1/swing-outcome-analysis-latest-v2.json` → Summe `byKey[].outcomesTotal` für `decision=trade` (PowerShell-Auswertung) | Reiner Bestand, keine neuen Runs |
| tradeRate | 0.1041 | Berechnet aus tradeCount/outcomesTotal (69/663) | Abgeleitet, basiert vollständig auf obigem Artefakt |
| noiseRate | nicht ableitbar (siehe SQ-011) | `artifacts/phase1/*` enthalten nur Outcomes ohne klare Decision-Verteilung; `artifacts/phase0-baseline/*` sind nicht Swing-spezifisch; keine aggregierte Decision-Distribution (TRADE/WATCH/BLOCKED) für Swing vorhanden. | Erforderlich wäre ein Swing-spezifisches Decision-Distribution-Artifact (TRADE/WATCH/BLOCKED, Zeitraum, Samplegröße); aktuell nicht im Repo. |

Weitere Baselines (Referenzen, keine neuen Zahlen):
- Phase0 Decision-Verteilung (TRADE/WATCH/BLOCKED) je Asset: `artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json` (siehe `decisionDistribution` pro Asset) – nutzbar für künftige TradeRate/WatchRate-Vergleiche.
- Coverage-Integrität: `artifacts/coverage/verification-summary-v2.md` (Swing-Routing sauber, FX-Alignment vorhanden).

## Backlog (Step-0 Tickets, Status=TODO)
| ID | Title | Scope / Files | Risiko | Erwartete Wirkung (Noise / TradeRate / Winrate) | Testplan | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SQ-001 | Playbook Schwellen relaxieren (Gold/Default) | `src/lib/engine/playbooks/index.ts` | Medium – kann Trade-Frequenz erhöhen | ↓Noise, ↑TradeRate, ?Winrate (Validierung nötig) | Unit: playbook gate thresholds; Snapshot/engine fixture | DONE |
| SQ-002 | Volatilitäts-Gating SPX/DAX/NDX/DOW (medium soft, high hard) + Schwellen relaxieren | `src/lib/engine/playbooks/index.ts` | Medium – Einfluss auf Block/Watch | ↓Noise, ↔/↑TradeRate, ?Winrate | Unit: volatility gate thresholds per index; regression on existing fixtures | DONE |
| SQ-003 | Event-Window Swing 48h → 24h | `src/lib/config/setupProfile.ts`, `src/lib/engine/playbooks/index.ts`, `src/lib/engine/modules/eventModifier.ts` (indirekt window rules) | Medium – engeres Blockfenster | ↓Noise (weniger Vorab-Blocks), ↔TradeRate, ↑Winrate erwartbar | Unit: playbook event gate; modifier window | DONE |
| SQ-004 | Price-Drift / Confidence Threshold 5%→8% + STALE neutraler | `src/lib/engine/confidence.ts`, evtl. `marketMetrics.ts` | Medium | ↓Noise, ↑Winrate, evtl. ↓TradeRate | Unit: confidence scoring boundaries; stale handling | DONE |
| SQ-005 | SignalQuality Divergenz/Orderflow-Konflikt weniger aggressiv (>=25 + Konflikt) | `src/lib/engine/signalQuality.ts` | Medium | ↓Noise, ↑TradeRate, ?Winrate | Unit: signal quality scoring; conflict thresholds | DONE |
| SQ-006 | Orderflow bei fehlenden Intraday-Daten neutral (50), keine negativen Flags | `src/lib/engine/perceptionDataSource.ts`, `src/lib/engine/orderflowMetrics.ts`, `src/lib/engine/playbooks/index.ts` | Medium | ↓Noise, ↑TradeRate | Unit: orderflow metric fallback; perception datasource stub | DONE |
| SQ-007 | Outcomes “Ambiguous Candle” Regel verbessern (TP vs SL Reihenfolge) | `src/app/api/cron/outcomes/evaluate/route.ts` | Medium | ↓Noise (ambiguity), ↑Winrate clarity | API/Integration: outcome evaluation order | DONE |
| SQ-008 | SoT klären (DB vs Artifacts) minimale sichere Korrektur, keine Migration | Docs + `reports/architecture/decision-single-source.md` | Low | ↑Governance, kein direkter KPI | Doc review/test: consistency check only | DONE |
| SQ-009 | Docs-Sync Schwellen/Regeln aktualisieren | `docs/setup-generation-audit.md`, `docs/perception-pipeline.md`, `docs/decisions-v1.md`, `docs/outcomes-audit.md`, `docs/model-a-forward-outcomes.md`, `docs/cron-schedules.md` | Low | ↑Clarity (indirekt ↓Noise) | Documentation diff; cross-check against code | DONE |
| SQ-011 | NoiseRate Baseline ableiten | Docs | Low | Datenlücke schließen / dokumentieren | Suche nach Decision-Distribution-Artefakt; falls nicht vorhanden, Dokumentation des Gaps | DONE |
| SQ-010 | Tests ergänzen: Playbook-Gates, Event-Window, Volatilität, Drift, Orderflow-neutral, Outcomes ambiguous | `src/lib/engine/__tests__/…`, API-Tests falls vorhanden | High (Test debt) | Stabilisiert KPIs, misst Noise/TradeRate/Winrate | Vitest suites for engine + API evaluate route | TODO |
| SQ-000 | Docs: Swing-Core (1D/1W) vs. 4H-Refinement klarstellen (kein 15m/1H im Swing) | `docs/perception-pipeline.md`, `docs/setup-generation-audit.md` | Low | ↑Clarity, kein KPI-Effekt | Docs review only | DONE |
| SQ-012 | Guardrails: Swing-Core vs. Refinement Timeframes, keine 15m/1H im Swing-Core | `src/lib/engine/perceptionDataSource.ts`, `src/server/perception/perceptionDataSourceFactory.ts`, `tests/engine/perceptionDataSource.swingGuard.test.ts` | Low | Governance/Safety, verhindert stille Leaks | Unit: swing guard test, full test suite | DONE |

## Arbeitsmodus (Slice-Regeln)
- Jede Implementations-Stufe = ein kleiner Codex-Slice: minimaler Scope, Tests grün (`npm test`, `npm run build`), Plan/Doc-Status aktualisieren.
- Kein Big Bang: pro Slice genau ein Ticket (oder enger Sub-Scope) schließen, Changelog pflegen.
- Shorts erlaubt; keine neuen Assets/Backtests; bestehende Artefakte bleiben Referenz.
- Docs als SoT: jede Codeänderung spiegelt sich in diesem Plan + referenzierten Docs wider.

## Changelog (initial leer)
| Datum | Ticket | Summary | Gründe | Betroffene Docs |
| --- | --- | --- | --- | --- |
| 2026-02-05 | SQ-003 | Swing Event-Window von 48h auf 24h reduziert; Gold-Swing harte Event-Blocks nur noch ≤24h; Swing-Profil Kontextfenster gestrafft; Tests hinzugefügt | Vorzeitige Blocks bei 30h entfernten Events vermeiden, präzisere Risikosteuerung | docs/swing-quality-implementation-plan.md (Status/Changelog) |
| 2026-02-05 | SQ-001 | Relaxed Gold/Default Swing Gates (Bias/Trend/SQ, Divergenz-Delta 25); Default Swing B ab Bias≥65 & Trend≥40 | Noise runter, mehr legitime Trades möglich | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/setup-generation-audit.md |
| 2026-02-05 | SQ-006 | Orderflow für Swing bei fehlenden/stalen Intraday-Daten neutralisiert (Score 50, keine negativen Flags); Konflikt-Flags nur noch Soft-Negative | Reduktion von False Negatives durch Datenlücken, keine unbeabsichtigten Hard-KOs | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/setup-generation-audit.md |
| 2026-02-05 | SQ-002 | SPX/DAX/NDX/DOW Swing: Volatilität medium nur noch soft (WATCH/downgrade), high bleibt Hard-KO; Schwellen Bias 65, Trend 55, Confirmation/SQ 50; Tests ergänzt | Noise runter, TradeRate leicht rauf bei stabilem Risikogate | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/setup-generation-audit.md |
| 2026-02-05 | SQ-007 | Outcomes: TP/SL gleiche Candle jetzt deterministisch (Gap/Body-Heuristik), sonst weiter ambiguous | Klarere Outcome-Zuordnung, weniger Ambiguous-Noise | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/outcomes-audit.md, docs/model-a-forward-outcomes.md |
| 2026-02-05 | SQ-008 | SoT geklärt: DB als Wahrheit für Outcomes/Backtests; Artefakte nur Snapshots; SoT-Doku hinzugefügt | Split-Brain-Risiko reduziert, klare Konsum-Pfade für Admin/Exports | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/single-source-of-truth.md, docs/outcomes-audit.md, docs/model-a-forward-outcomes.md |
| 2026-02-05 | SQ-009 | Docs-Sync: Event-Window 24h, Orderflow-Stale neutral, Drift 8 %, SQ Divergenz Δ≥25+Konflikt, SPX/Gold/Default Schwellen, Ambiguous-Resolution & SoT-Verlinkung | Konsistente Dokumentation, reduzierte Widersprüche | docs/swing-quality-implementation-plan.md (Status/Changelog), diverse docs/* |
| 2026-02-05 | SQ-011 | NoiseRate Baseline: nicht ableitbar aus vorhandenen Artefakten (keine Swing-Decision-Distribution); Gap dokumentiert | Transparenz über fehlende Kennzahl, nächster Schritt ist Artefakt/Export mit Decision-Verteilung | docs/swing-quality-implementation-plan.md (Baseline/Changelog) |
| 2026-02-05 | SQ-005 | Swing SignalQuality: Divergenz erst ab Δ≥25 + Konflikt, Low-Confidence max. Downgrade auf B; Intraday unverändert | Weniger aggressive Abwertungen bei legitimen Swing-Signalen, reduziert False Negatives | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/setup-generation-audit.md |
| 2026-02-05 | SQ-004 | Swing Confidence: Price-Drift-Threshold auf 8 % angehoben; STALE-Daten neutralisiert (keine Confidence-Strafe); intraday unverändert | Swing-Volatilität realistischer abbilden, unnötige Abwertungen vermeiden | docs/swing-quality-implementation-plan.md (Status/Changelog), docs/perception-pipeline.md |
| 2026-02-05 | SQ-000 | Docs-Sync Timeframes: Swing-Core 1D/1W, 4H nur Refinement (soft, neutral wenn fehlend/stale), kein 15m/1H im Swing | Dokumentation an Code-Stand (setupProfile/timeframeConfig) angepasst, Verwechslungen vermieden | docs/perception-pipeline.md, docs/setup-generation-audit.md, docs/swing-quality-implementation-plan.md |
| 2026-02-05 | SQ-012 | Guardrails Swing vs. Intraday: Core=1D/1W strikt, 4H nur Refinement; 15m/1H werden für Swing fail-fast blockiert | Verhindert stille Timeframe-Leaks in PerceptionDataSource; macht Fehlkonfiguration sichtbar | docs/swing-quality-implementation-plan.md (Status/Changelog); code guard + tests |
