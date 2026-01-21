# Phase-0 Freeze Baseline (Option A, final)

Monitoring-only baseline, keine Policy-Lockerungen. Ziel: belegbare, reproduzierbare Checks für Swing-Coverage und FX-Alignment.

## Phase-0 Ziel & Invarianten
- Swing 1D/1W: kein `generic-swing-v0.1`, kein Reason `fallback generic`.
- Intraday 1H: `generic-swing-v0.1 | non-swing profile` ist erlaubt (intended).
- WTI -> `energy-swing-v0.1`, Silver -> `metals-swing-v0.1` (Swing-Routing).
- FX (eurusd/gbpusd/usdjpy/eurjpy): alignmentDistribution (LONG/SHORT/NEUTRAL) muss im Phase-0 Payload/Baseline sichtbar sein.

## Step 1 (Option B) – Verifikation Swing-Coverage clean
**Acceptance Criteria**
- Swing timeframes (1D/1W) & Labels (eod/us_open/morning/(null)): kein `generic-swing-v0.1` / `fallback generic`.
- Intraday 1H: generic/non-swing erlaubt.
- WTI -> `energy-swing-v0.1`, Silver -> `metals-swing-v0.1`.
- FX alignmentDistribution vorhanden und >0 für alle FX-Assets.

**Ergebnis (Stand 2026-01-21)**
- Baseline: `artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json`
- Verify: `artifacts/coverage/verify-swing-coverage-clean-v2.json`, `artifacts/coverage/verify-swing-coverage-clean-v2.md`
- Summary: `artifacts/coverage/verification-summary-v2.md`
- Fakten: Violations 0; wtiOk true; silverOk true; fxAlignmentPresent true.

## Reproduzierbarkeit / Commands
- Audit 30d: `npm run audit:playbooks` -> `artifacts/coverage/audit-playbooks-l30-v1.txt` (UTF-16LE)
- Audit 60d: `npm run audit:playbooks -- 60` -> `artifacts/coverage/audit-playbooks-l60-v1.txt`
- Baseline: `npm run phase0:baseline` -> schreibt unter `artifacts/phase0-baseline/<timestamp>.json`
- Verify: `npx ts-node --project scripts/tsconfig.scripts.json scripts/verify-swing-coverage-clean.ts` -> erzeugt verify-swing-coverage-clean-v2.{json,md}
- Tests (optional, targeted):
  - `npx vitest tests/playbooks/playbookResolverProfileFallback.test.ts`
  - `npx vitest tests/coverage/verifySwingCoverageFxAlignmentFlag.test.ts`

Erwartung: Swing-Violations 0; wtiOk/silverOk true; fxAlignmentPresent true; Intraday weiter generic/non-swing.

## Artefakte / Snapshots
- `artifacts/coverage/audit-playbooks-l30-v1.txt`, `artifacts/coverage/audit-playbooks-l60-v1.txt`
- `artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json`
- `artifacts/coverage/verify-swing-coverage-clean-v2.{json,md}`
- `artifacts/coverage/verification-summary-v2.md`

## Out of Scope / bewusst später
- Intraday Playbooks/Resolver (bleibt generic für 1H).
- CI-Guard (noch nicht aktiviert; könnte auf verify-Script aufsetzen).
- Tuning Metals/Energy (nutzen aktuell `evaluateDefault`).

## Nächste Schritte (kurz)
- Optional: weitere Asset-Klassen/Playbooks ergänzen (z.B. weitere Commodities/Energy) oder Phase-1 Outcome-Analysen.
