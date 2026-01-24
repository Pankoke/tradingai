# Playbook Coverage Audit (Swing) – v1

Datum: 2026-01-23  
Quelle: Repo-Code + Artefakt `artifacts/phase1/swing-outcome-analysis-latest-v1.json` (generatedAt 2026-01-23T15:41:39Z, days=180, 1D/1W, labels eod/us_open/morning/(null))

## 1) Registry / Expected Swing-Playbooks
Quelle: `src/lib/engine/playbooks/index.ts`

- Asset-spezifisch: `gold-swing-v0.2`, `spx-swing-v0.1`, `dax-swing-v0.1`, `ndx-swing-v0.1`, `dow-swing-v0.1`
- Asset-Class Swing: `metals-swing-v0.1`, `energy-swing-v0.1`, `crypto-swing-v0.1`, `fx-swing-v0.1`, `index-swing-v0.1`
- FX Asset-spezifisch: `eurusd-swing-v0.1`, `gbpusd-swing-v0.1`, `usdjpy-swing-v0.1`, `eurjpy-swing-v0.1`
- Generic: `generic-swing-v0.1` (Fallback, sollte für Swing nicht genutzt werden)

## 2) Observed in Outcome-Artefakt
Aus `swing-outcome-analysis-latest-v1.json` (byKey Aggregation)

Playbooks vorkommend (with outcomesTotal):
- energy-swing-v0.1: 7
- metals-swing-v0.1: 4
- gold-swing-v0.2: 4
- spx-swing-v0.1: 4
- dax-swing-v0.1: 4
- ndx-swing-v0.1: 4
- dow-swing-v0.1: 4
- crypto-swing-v0.1: 4
- eurusd-swing-v0.1: 4
- gbpusd-swing-v0.1: 4
- usdjpy-swing-v0.1: 4
- eurjpy-swing-v0.1: 4

Nicht im Artefakt: `index-swing-v0.1`, `fx-swing-v0.1`, `generic-swing-v0.1`.

## 3) Observed (DB Cross-Check)
Keine frische DB-Auswertung in diesem Audit durchgeführt. Artefakt gilt als Source-of-Truth für diesen Stand. Hinweis: Wenn DB-Auszug nötig, `setup_outcomes` + `snapshot_items` Join für letzten 180d nutzen.

## 4) Diff / Bewertung
- Missing in Artefakt (trotz Registry): `index-swing-v0.1`, `fx-swing-v0.1`, `generic-swing-v0.1` (letzteres ist bewusst Fallback, sollte idealerweise nicht erscheinen).
- Unexpected extras: keine (alle beobachteten IDs sind registriert und Swing-spezifisch).
- Generic/Fallback: Im Artefakt nicht vorhanden (gut).

Mögliche Gründe für fehlende index/fx class playbooks:
- Resolver priorisiert asset-spezifische (spx/dax/ndx/dow) vor `index-swing-v0.1`; daher kein Bedarf für die Klassen-ID.
- FX class (`fx-swing-v0.1`) wird nur gezogen, wenn kein Asset-spezifischer Treffer; aktuelle Daten enthalten ausschließlich asset-spezifische FX-IDs.

## 5) Empfehlungen / Nächste Schritte
- Keine Code-Änderung erforderlich, wenn Ziel ist: nur asset-spezifische Playbooks in Artefakt zeigen.
- Falls Klassen-Playbooks explizit sichtbar sein sollen: Analyzer-Filter/Resolver prüfen, ob `index-swing-v0.1` und `fx-swing-v0.1` überhaupt noch benötigt werden; sonst in UI als “legacy/fallback” kennzeichnen oder aus Registry entfernen.
- Regelmäßig prüfen, ob `generic-swing-v0.1` in Artefakten auftaucht (sollte 0 bleiben). Bei Auftreten: Backfill + Resolver-Guard prüfen.
- Optional: DB-Spotcheck (180d) für playbookId/setupPlaybookId, um Artefakt-Vollständigkeit gegen Live-Daten zu bestätigen.

## 6) Runbook (für erneute Erzeugung)
- Outcomes backfill (Bsp): `curl -X POST "$BASE_URL/api/cron/outcomes/backfill?daysBack=180&limitSetups=1500" -H "Authorization: Bearer $CRON_SECRET"`
- Analyzer: `npm run phase1:analyze:swing -- --days=180`
- Artefakt laden (Admin): Outcomes Overview / Playbooks Overview (ziehen latest Artefakt aus Storage/Blob)
