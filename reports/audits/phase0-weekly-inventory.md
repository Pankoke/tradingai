# Phase0 + Weekly Health Inventory (IST)

## Was ist Phase0?
Phase0 ist ein Monitoring-Endpunkt, der aus persistierten Snapshots/Setups (und Outcomes im Zeitfenster) pro Asset eine Summary + Diagnose-Felder berechnet. Diese JSON wird vom Weekly-Report-Skript gerendert und in `reports/weekly/*.md` abgelegt.

## A) Phase0-Endpoint Inventar

### Endpoint / URL / Query-Parameter
- Route: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`
- URL: `/api/admin/playbooks/phase0-gold-swing`
- Query-Parameter (aus `GET`):
  - `daysBack` (default 30)
  - `assetId` (default `"gold"`)
  - `playbookId` (optional)
  - `dedupeBy` = `setupId|snapshotId` (default `snapshotId`)
  - `windowField` = `evaluatedAt|createdAt|outcomeAt` (default `evaluatedAt`)
  - `playbookId` wird gegen `setup.setupPlaybookId` gefiltert

### Berechnete Felder (High Level)
Im Response `data`:
- `meta` (assetId/profile/timeframe/daysBack)
- `decisionDistribution`, `gradeDistribution`, `outcomesByDecision`
- `watchToTradeProxy`
- `summaries` (optional, map per asset)
- `debugMeta` (optional, passthrough mit BTC/GOLD Diagnostik)

Quelle: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` und Schema `src/contracts/phase0Payload.schema.ts`.

### Asset-spezifische Branches (hardcoded)
In `route.ts` gibt es mehrere harte Abfragen auf `canonicalAssetId === "btc"` und Gold-spezifische Pfade:
- BTC-spezifisch: Alignment-/RRR-/Regime-/Watch-Segmente + Outcome-Buckets (`canonicalAssetId === "btc"` an vielen Stellen).
- Gold-spezifisch: `isGoldAsset(...)` Hilfsfunktion plus Watch-Segmente/Upgrade-Logik.
Fundstellen: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts` (z. B. `canonicalAssetId` branches, `isGoldAsset`).

**Hardcoded branches (Auszug):**
- `canonicalAssetId === "btc"`: BTC Diagnostics/Alignment/Outcomes Buckets.
- `isGoldAsset(...)`: Gold-spezifische Watch-Segments/Upgrade.
Siehe `route.ts` Branches (z. B. um Zeilen ~219, ~289, ~323, ~350, ~366, ~626–837).

## B) Weekly Report Generator & Input JSONs

### Eingänge / Dateien
`scripts/build-weekly-health-report.ts` lädt:
- `phase0_gold.json`
- `phase0_btc.json`
Diese beiden Files werden in der Action erzeugt (siehe Workflow unten).

### Sections / Asset-Liste
Der Weekly-Report nutzt eine feste Asset-Reihenfolge:
```
["gold","btc","eurusd","gbpusd","usdjpy","eurjpy","spx","dax","ndx","dow"]
```
und stellt sicher, dass diese Assets im `summaries`-Objekt vorhanden sind (hardcoded `ensure(...)`).
Fundstelle: `scripts/build-weekly-health-report.ts` (Asset-Order + ensure).

### Hardcoded vs. skalierbar
- Hardcoded: Laden von genau `phase0_gold.json` + `phase0_btc.json`, feste Asset-Order, feste `ensure(...)`-Liste.
- Skalierbar: `summaries` kann beliebige Assets enthalten (falls aus Payload geliefert), aber der Report rendert nur die hardcodierte Reihenfolge.

## C) Phase0 Payload Contract (Zod)

Schema: `src/contracts/phase0Payload.schema.ts`
- Required:
  - `meta` mit `assetId/profile/timeframe/daysBack`
  - `decisionDistribution` (mit `total`)
- Optional:
  - `gradeDistribution`, `outcomesByDecision`, `watchToTradeProxy`
  - `debugMeta` ist `.passthrough()` (erlaubt asset-spezifische Erweiterungen)
  - `summaries` optional

**ETH-Kompatibilität (Contract):**
- Schema ist generisch genug; ETH würde das Contract erfüllen, solange `meta` + `decisionDistribution` vorhanden sind.
- ETH-spezifische Diagnostics sind optional (keine Pflichtfelder für BTC/GOLD).

## D) GitHub Action Workflow (Phase0 Monitor)

Workflow: `.github/workflows/phase0-monitor.yml`
- Trigger: `schedule` (cron: `0 6 * * 1`), `workflow_dispatch`
- Curl-Calls:
  - Gold: `phase0-gold-swing?assetId=gold&playbookId=gold-swing-v0.2...`
  - BTC: `phase0-gold-swing?assetId=btc&playbookId=crypto-swing-v0.1...`
- Output: schreibt `phase0_gold.json` + `phase0_btc.json`
- Report: `scripts/build-weekly-health-report.ts` → `reports/weekly/*.md`
- Commit: Report wird in Repo committet.

## E) Admin UI Reports

Admin-Seite: `src/app/[locale]/admin/(panel)/monitoring/reports/page.tsx`
- Liest `reports/weekly/*.md` von local FS (`reports/weekly`)
- Rendert Liste (hardcoded “Gold / BTC” in Tabelle)
- Route für Latest: `src/app/[locale]/admin/(panel)/monitoring/reports/latest/page.tsx`

## F) Current Assets in Weekly

Aktuell verarbeitet (Weekly):
- Gold
- BTC
- FX/Index Assets sind im `assetOrder` enthalten, aber nur wenn `summaries` in Phase0 Payload vorhanden sind.
- ETH wird derzeit **nicht** geladen (kein `phase0_eth.json`, keine Workflow-Curl, kein `ensure("eth", ...)`).

## G) Recommendations (kurz, konkret)
1) **ETH enablement**: Workflow + Weekly Script erweitern:
   - Workflow: `phase0_eth.json` per Curl (assetId=eth)
   - Weekly: `loadJson("phase0_eth.json")` + `ensure("eth", ...)` + `assetOrder` erweitern
2) **Asset-Liste zentralisieren**: Asset-Order und `ensure(...)` in eine Shared Config auslagern, um Hardcoding zu reduzieren.
3) **Phase0 Endpoint**: BTC/GOLD Sonderlogik bewusst markieren oder kapseln, um neue Assets sauber zu integrieren.

