# Phase-1 Requirements (Analyse, nicht implementiert)

Quelle: vorhandene Admin-Seiten und Services (Stand 2026-01-21).

## Datenmodell (relevant)
- perceptionSnapshots (setups array, snapshotTime, label, assetId, timeframe).
- outcomes (hit_tp/sl/open/expired/ambiguous, evaluatedAt/evaluatedTf, setupId?, snapshotId?).
- decisions/setup fields: grade, decision (TRADE/WATCH/BLOCKED), watchSegment/fxWatchSegment, alignmentDistribution (Phase-0 summaries).
- playbooks: IDs per asset/class (`gold-swing-v0.2`, index/fx/crypto/metals/energy swing).

## Metriken (Phase-1 Zielsetzung)
- Winrate (TP vs SL) je decision/grade/segment/alignment.
- Avg R / MAE / MFE (wenn Outcome-Level verfügbar).
- Coverage: setups count per asset/timeframe/label/playbook.
- Join-Quality: outcomes mapped to setups (via snapshotId+setupId).
- Expiry / status distribution (open/expired/ambiguous).
- Alignment/segment vs winrate correlation.

## Dimensionen / Filter
- assetId, timeframe (1D/1W primär), label (eod/us_open/morning/null).
- playbookId (asset-specific vs class).
- decision (TRADE/WATCH/BLOCKED), grade (A/B/NO_TRADE).
- watchSegment/fxWatchSegment (FX), index segments.
- alignment (LONG/SHORT/NEUTRAL) für FX; regime for index if present.
- eventRisk/high vol flags where available.

## Datenverfügbarkeit (Code-Referenzen)
- Phase-0 summaries: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` liefert decision/grade/watchSegments/ alignmentDistribution/labelsUsedCounts.
- Weekly Report Renderer: `scripts/build-weekly-health-report.ts` konsumiert summaries.* (gold/btc/spx/dax/ndx/dow + FX), rendert decision/grade/watch segments/alignment distribution.
- Engine Health: `src/src/server/admin/outcomeService` (import in `outcomes/engine-health/page.tsx`) – nutzt outcomes-aggregation per days/asset/playbook.
- Calibration: `src/src/server/admin/calibrationService` – liefert Calibration Stats je playbook/profile/days.
- Threshold Simulation: `src/src/server/admin/playbookThresholdService` + `playbookThresholdSimulation` – Gold-fokussiert, Simulation grids.

## Phase-1 Lücken
- AvgR/MAE/MFE: keine bestehenden Felder/Exports sichtbar (nicht in Phase-0 summaries).
- Outcomes-join auf Setups in UI: fehlender Drilldown (Outcome -> Setup -> Snapshot -> Reasons).
- Reasons/Segments vs Outcomes Korrelation: fehlt in Engine Health / Weekly Report.
- Intraday Outcomes: out-of-scope derzeit.
- Playbook-level Phase-1 metrics (per playbookId across assets) nicht in UI.
