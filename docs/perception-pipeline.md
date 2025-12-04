# Perception-Pipeline – Kurzübersicht

## 1. Überblick
- **Perception Snapshot**: periodischer Markt-Snapshot mit Setups (inkl. Setup-of-the-Day), Scores/Rings (Bias, Event, Sentiment, Orderflow, Confidence) und Metadaten.
- **Nutzung**: wird vom Frontend (z. B. PerceptionTodayPanel) angezeigt, inklusive Rangliste und Bias-/Ring-Visualisierungen.
- **Speicherung**: `perceptionSnapshots` + `perceptionSnapshotItems` in Postgres/Neon über Drizzle.

## 2. Datenfluss: Von Cron zur UI
### 2.1 Cron-Build – `/api/cron/perception`
- Wird von einem externen Scheduler (Vercel Cron, GitHub Actions o. ä.) aufgerufen.
- Ruft den Builder auf (u. a. `buildAndStorePerceptionSnapshot` in `src/features/perception/build/buildSetups.ts`), der:
  - Basisdaten lädt (Assets, Events, Bias via Provider/Engine),
  - die Perception-Engine ausführt (`buildPerceptionSnapshot`),
  - einen neuen Snapshot + Items in die DB schreibt.

### 2.2 Snapshot-Access – `/api/perception/today`
- Lädt den neuesten Snapshot aus der DB (Repository).
- Kann heuristisch entscheiden, ob ein frischer Snapshot gebaut werden soll (z. B. wenn keiner von heute existiert).
- Liefert den „aktuellen“ Snapshot an das Frontend und wird im Live-Modus vom PerceptionTodayPanel konsumiert.

### 2.3 Health-Check – `/api/health/perception`
- Lädt den neuesten Snapshot, prüft Alter, Item-Anzahl und Bias-Neutralität.
- Antwortet mit `ok/warn/error` plus `warnings[]`; gedacht für Monitoring/Debug (Status-Page/Uptime).

## 3. Live vs. Mock: Datenmodus
- Typ: `PerceptionDataMode = "live" | "mock"` in `src/lib/config/perceptionDataMode.ts`.
- Ermittlung: `NEXT_PUBLIC_PERCEPTION_DATA_MODE="mock"` → Mock-Modus, sonst Live-Modus.

**Live-Modus**
- Frontend: PerceptionTodayPanel holt echte Daten via `/api/perception/today`.
- Cron/Health: arbeiten gegen die reale DB/Engine.

**Mock-Modus**
- PerceptionTodayPanel nutzt einen eingebauten, typisierten Mock-Snapshot (kein Netzwerk-Call).
- UI zeigt ein Badge „Mock mode (demo data)“ (`perception.today.mode.mock`).
- Geeignet für UI-/Demo-Entwicklung ohne DB/Market-Data.

## 4. Wichtige ENV-Variablen
- `DATABASE_URL` (Neon/Postgres): Drizzle-DB-Connection für Snapshots/Bias/etc.
- `CLERK_*` (Auth): Clerk Frontend/Backend Keys für Auth.
- `NEXT_PUBLIC_PERCEPTION_DATA_MODE`: `"live"` oder `"mock"` steuert den Datenmodus im Frontend.
- Weitere projektspezifische Keys (z. B. Market-Data/Bias-Provider): je nach Deployment setzen; keine Secrets im Repo.

## 5. Lokale Entwicklung: typische Szenarien
### 5.1 Live-Modus lokal
```
NEXT_PUBLIC_PERCEPTION_DATA_MODE=live
npm run dev
```
- Optional: Cron manuell triggern (`curl http://localhost:3000/api/cron/perception`), damit frische Snapshots entstehen.
- PerceptionTodayPanel holt echte Daten über `/api/perception/today`.

### 5.2 Mock-Modus lokal
```
NEXT_PUBLIC_PERCEPTION_DATA_MODE=mock
npm run dev
```
- Panel zeigt sofort den Demo-Snapshot mit Mock-Badge, keine DB/Market-Data nötig.

### 5.3 Health-Check
```
curl http://localhost:3000/api/health/perception
```
- `status:"ok"` → Snapshot aktuell & Bias nicht komplett neutral.
- `status:"warn"/"error"` → `warnings[]` lesen (z. B. „No snapshot found“, „All bias scores are neutral (50)“).

## 6. Troubleshooting (Kurz)
- `/api/perception/today` liefert leer → Cron ausgeführt? Health-Endpoint prüfen.
- Bias überall 50 → Health-Warnings checken (Bias-Neutral-Check).
- Mock-Modus ohne Effekt → `NEXT_PUBLIC_PERCEPTION_DATA_MODE` auf `"mock"` setzen, Badge im Panel sichtbar?
