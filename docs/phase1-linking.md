# Phase-1 Linking (Join-Readiness) – How to run

Artefact-first Scripts (keine DB-Schema-Änderung):
- `npm run phase1:join-stats` (default 30d, Swing 1D/1W, Labels eod/us_open/morning/(null))
  - Output: `artifacts/phase1/join-stats-<timestamp>-v1.{json,md}`
  - Latest copies: `artifacts/phase1/join-stats-latest-v1.{json,md}`
  - Params: `--days=60`, `--asset=gold`, `--timeframes=1d,1w`, `--labels=eod,(null)`
- `npm run phase1:analyze:swing` (default 30d, Swing 1D/1W, Labels eod/us_open/morning/(null))
  - Output: `artifacts/phase1/swing-outcome-analysis-<timestamp>-v1.{json,md}`
  - Latest copies: `artifacts/phase1/swing-outcome-analysis-latest-v1.{json,md}`
  - Params analog zu join-stats: `--days=60`, `--asset=gold`, `--timeframes=1d,1w`, `--labels=eod,(null)`
  - Persisted dimensions (Increment 2): setups JSON enthält zusätzlich `playbookId`, `grade`, `decision` (Quelle: snapshot builder). Alignment/decisionReasons/watchSegment werden nur gesetzt, wenn zur Laufzeit vorhanden. Historische Daten benötigen Backfill.

Definitionen:
- Join-Key: (snapshot_id, setup_id) aus `setup_outcomes` ⇆ `perception_snapshot_items`.
- joinRate = matched_outcomes / outcomesTotal (im Zeitfenster, Label/TF-Filter).
- Swing-Filter: timeframes {1d,1w}, Labels {eod, us_open, morning, (null)}.

Phase-1 Outcomes (Analyzer):
- Quelle: `setup_outcomes.outcome_status` (keine *_hit_at Felder).
- Mapping (case-insensitive): TP (`hit_tp`/`tp`), SL (`hit_sl`/`sl`/`stopped`), EXPIRED (`expired`), AMBIGUOUS (`ambiguous`), INVALID (`invalid`), OPEN (`open`/`pending`/`none`), UNKNOWN (alles andere/null).
- Closed = TP+SL+Expired+Ambiguous+Invalid; Open = OPEN+UNKNOWN.
- Winrate: tp/(tp+sl) wenn tp+sl>0, sonst n/a. CloseRate = closed/outcomesTotal.
Empfohlene Go/No-Go Schwelle:
- joinRateSwing ≥ 0.95 (informativ, kein Hard-Fail in 1.0).

Tests:
- `npx vitest tests/phase1/joinStatsSchema.test.ts` prüft Payload/Markdown-Format join-stats.
- `npx vitest tests/phase1/swingOutcomeAnalysisSchema.test.ts` prüft Payload/Markdown-Format Outcome-Analyse.
- `npx vitest tests/phase1/persistedDimensionsWrite.test.ts` prüft Persistenz-Helfer (playbookId/grade/decision).

Artefakte liegen unter `artifacts/phase1/`.
