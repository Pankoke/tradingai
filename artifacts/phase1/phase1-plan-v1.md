# Phase-1 Plan (ohne große UI-Änderungen)

Ziel: Phase-1 Metriken (Winrate/AvgR/Join-Qualität) auf vorhandenen Admin-Seiten verankern, inkrementell.

## Step 0 – Data readiness & Linking
- Verifiziere Outcome->Setup Join (snapshotId+setupId) Konsistenz; falls Lücken, ergänze Mapping-Helper.
- Stelle sicher, dass Outcomes Felder für R/MAE/MFE verfügbar oder berechenbar sind; falls nicht, Spezifikation definieren.
- Script: kleiner Aggregator für Swing (1D/1W) je asset/playbook/label → JSON/MD Artefakt für Entwicklercheck.

## Step 1 – Analysis Script/Endpoint
- Neuer Server-Endpoint oder Script (kein UI): Aggregiert Outcomes per asset/playbook/decision/segment/alignment.
- Outputs: winRateTpVsSl, evaluatedCount, open/expired counts, optional AvgR/MAE/MFE falls Daten vorhanden.
- Ziel: Artefakt unter `artifacts/phase1/analysis-<timestamp>.json/md`.

## Step 2 – Minimal UI-Integration (bestehende Admin-Seiten erweitern)
- Engine Health: ergänze AvgR/MAE/MFE + Alignment/Segment Breakdown (wenn Daten vorhanden).
- Playbook Calibration: zeige Outcome-Join-Status + winrate per playbook/profile/days.
- Weekly Health Report: optional Flag “Phase-1 run” mit Parametern + Link zum Phase-1 Artefakt.

## Step 3 – Backlog / IA Verbesserungen (optional, nicht jetzt)
- Weekly Reports: Drilldown-Link Outcome→Setup→Snapshot (einfacher Table/Modal).
- Playbook Thresholds: Hinzufügen von Outcome-basierten Guards (wenn Metriken verfügbar).
- Navigation: Gruppierung “Monitoring (Phase-0)” vs “Analysis (Phase-1)” im Admin.

## Offene Entscheidungen / Annahmen
- Intraday bleibt vorerst out-of-scope.
- Falls AvgR/MAE/MFE fehlen, Phase-1 fokussiert zunächst auf winrate/coverage/segmentation.
- CI-Guard für Swing-Coverage bleibt optional.

## Commands (Repro für aktuelle Baseline)
- `npm run audit:playbooks` / `npm run audit:playbooks -- 60`
- `npm run phase0:baseline`
- (geplant) Phase-1 Aggregator Script: noch zu implementieren.
