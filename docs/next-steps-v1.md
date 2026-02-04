# Next-Steps v1 – Roadmap-Ready

Dieses Dokument priorisiert die offenen Gaps und leitet daraus konkrete, **mergebare Vertical Slices** ab.

---

## Top-10 Gaps (priorisiert)

1. **G-02 – Engine nicht sauber entkoppelt**  (asOf/Determinismus erledigt, Imports offen)
2. **G-01 – Fehlender Backtesting-Simulator (Execution/Replay)**  
3. **G-03 – Kein klarer Market-Data-Ingestion-Layer**  
4. **G-04 – Event-Domäne nicht sauber getrennt**  
5. **G-05 – Sentiment-Boundary langfristig absichern**  
6. **G-06 – Kein Journaling / Trading Review**  
7. **G-07 – Keine Signal-Domäne**  
8. **G-09 – Fehlende Architecture-Guardrails**  
9. **G-08 – UI nicht domänenorientiert**  
10. **G-10 – Langfristige Observability-Vertiefung**

---

## Umsetzungsslices (Stories)

---

### Story 1 – Engine-Boundary erzwingen

**Ziel**  
Engine server-frei machen; asOf/Determinismus erledigt, Feature-Layer Ports eingef�hrt.

**Scope**
- ESLint-Errors bei `src/lib/engine/** → src/server/**`
- Ports/Adapter statt Server-Imports; Engine konsumiert nur Ports

**Non-Scope**
- Kein Feature-Change

**Akzeptanz**
- Engine läuft mit Mock-Snapshots
- Keine Server-Imports mehr

**Tests**
- Pure Unit-Tests

**Codex-Prompt**
Refactor the Perception/Strategy Engine to fully respect domain boundaries.

Remove all imports from src/server/** in src/lib/engine/**

Enforce asOf as a required parameter through the engine call chain

Do not change behavior or scoring logic

All tests must remain deterministic

---

### Story 2 – Market-Data Domain Services

**Ziel**  
Expliziter Market-Data-Layer.

**Scope**
- `normalizeCandles`
- `selectCandleWindow`
- `aggregateCandles`

**Akzeptanz**
- Engine konsumiert MarketSnapshot
- Derived Candles explizit markiert

**Codex-Prompt**
Introduce a domain/market-data layer with pure services for
normalization, window selection, and aggregation.
Ensure deterministic behavior and no engine imports from server code.

---

### Story 3 – Event-Domain Ports

**Ziel**  
Event-Domäne sauber trennen.

**Scope**
- EventSnapshot
- Ports für Event-Inputs

**Akzeptanz**
- Engine kennt nur EventSnapshot
- Server liefert Inputs via Adapter

**Codex-Prompt**
Extract Event domain logic into a dedicated domain/events module.
The engine must only consume EventSnapshot inputs via ports.

---

### Story 4 – Backtesting Execution MVP

**Ziel**  
Replay-fähiges Backtesting.

**Scope**
- Candle Replay
- Market Orders
- Deterministische Execution

**Akzeptanz**
- Same input → same output
- No lookahead

**Codex-Prompt**
Extend the Backtest runner with deterministic candle replay
and basic market order execution.
Persist trades and results without changing live logic.

---

### Story 5 – Journaling (Trading Review)

**Ziel**  
Manuelle Nachbereitung ermöglichen.

**Scope**
- Trade Notes
- Reviews

**Akzeptanz**
- Trade kann kommentiert & ausgewertet werden

**Codex-Prompt**
Add a journaling domain allowing users to attach notes and reviews
to trades and setups without affecting the engine.

---

### Story 6 – Architecture Guardrails

**Ziel**  
Drift verhindern.

**Scope**
- ESLint no-restricted-imports
- Docs für erlaubte Abhängigkeiten

**Akzeptanz**
- CI schlägt bei Boundary-Verletzungen fehl

**Codex-Prompt**
Introduce strict architecture guardrails via ESLint
to prevent future boundary violations.


---

## Empfohlene Reihenfolge

1 → 2 → 3 → 4 → 5 → 6

> Update 2026-02-03: Execution MVP entries (next-step-open) implemented; next slice: positions/PnL/exit.
Update 2026-02-03b: Backtest runs werden jetzt in 'backtest_runs' (runKey-unique, JSONB trades/kpis) persistiert; n�chster Schritt: UI/Explorer und ggf. normalisierte trades-Tabelle.
- Completed: Admin API for backtest_runs listing/detail. Next: UI viewer for runs/trades.

- Completed: Admin backtest runs viewer; Next: compare runs UI/export, normalized trades table.


- Completed: Admin backtest compare view; Next: export/CSV and normalized trades table.

- Done: Backtest migration + Nav link + Run button; Next: CSV/export & normalized trades table.
- Done: Backtest CSV export (trades + kpis); Next: compare-export or normalized trades table.
- Done: parameterized backtest run form (fee/slippage/holdSteps); Next: CSV compare/export or normalized trades.
- Done: Compare CSV export; Next: normalized trades table or CSV compare by reason detail.
- Done: Compare delta CSV export (admin); Next: normalized trades table / richer analytics.
- Done: Migration hygiene PR1 (journal synced); Next: DX scripts/reset guidance.
- Done: Migration hygiene PR2 (scripts+guide); Next: optional safety check before migrate on non-empty DB.
- Done: Admin backtests UX slice (filters/sort/clone). Next: batch sweeps or normalized trades table.
- Added: Admin backtests run form now uses a date picker (UTC start/end) for from/to.
- New: Backtest runner kann intern Playback (persistierte perception_snapshots/items) nutzen; Next: API/UI Toggle expose.
- Done: Backtest playback toggle (Admin run form/API); Next: expose playback in compare/export or default based on use case.
- Done: Backtest Run-Form nutzt Asset-Dropdown aus /api/admin/assets; Next: optional Batch-Runs / Sweeps.
