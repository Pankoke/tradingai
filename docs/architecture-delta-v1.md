# Architektur-Delta v1

Dieses Dokument beschreibt Abweichungen zwischen der ursprünglichen
SOLL-Architektur (`architecture-v1.md`) und dem realen Implementierungsstand.

---

## 1. Backtesting weiter als ursprünglich angenommen

**Geplant (v1):**
- Kein funktionales Backtesting

**Ist:**
- Deterministischer Backtest-Runner vorhanden
- Snapshot-basiert
- Reports & KPIs verfügbar

**Delta**
→ Backtesting ist **MVP-fähig**, aber ohne Execution-Simulation.

---

## 2. Sentiment weiter fortgeschritten

**Geplant:**
- Einfache Sentiment-Integration

**Ist:**
- SentimentSnapshotV2
- Multi-Source-Merge
- Health-Integration
- Backfill-Services

**Delta**
→ Sentiment ist **architektonisch sauberer** als andere Domänen.

---

## 3. Event-Domäne technisch stark, strukturell falsch platziert

**Geplant:**
- Eigene Event-Domäne mit Ports

**Ist:**
- Logik im Engine-Bereich
- Server-nahe Ingestion

**Delta**
→ Funktional top, Boundary-Verletzung.

---

## 4. Engine stärker als Zielbild, aber riskanter

**Ist**
- Sehr mächtige Engine
- Klare Scoring-Flows
- generatedAt/asOf deterministisch (keine `new Date()`-Defaults mehr)

**Abweichung**
- Importiert Infrastruktur
- Server-Imports/Ports noch offen

---

## 5. Architektur-Guardrails teilweise früher umgesetzt

**Geplant**
- Später

**Ist**
- ESLint-Guardrails aktiv
- no-restricted-imports vorhanden

**Delta**
→ Guardrails existieren, müssen verschärft werden.

---

## Fazit

> **Die Architektur-Vision ist korrekt.  
> Die Realität ist weiter – aber inkonsistent.**

Nächste Version der Architektur sollte:
- Backtesting explizit berücksichtigen
- Event & Market-Data Domänen klar schneiden
- Engine als „Pure Core“ definieren
