# Verification Summary (Phase-0 Swing Coverage / Audit) - v2

Date: 2026-01-21

## Repo Facts (code references)
- Resolver/Matchers: `src/lib/engine/playbooks/index.ts` — intraday-only generic guard; asset/class playbooks (FX/Index/Metals/Energy/Crypto) resolved before generic; FX before Crypto; metals/energy matchers for silver/wti.
- Coverage tools: `scripts/audit-playbook-coverage.ts`, `scripts/capture-phase0-baseline.ts`, `scripts/verify-swing-coverage-clean.ts` (UTF-16 aware parsing, checks swing violations, WTI/Silver, FX alignment flag).
- Baseline structure: `artifacts/phase0-baseline/*` stores `assets.<assetId>.alignmentDistribution`.
- Tests added: `tests/coverage/verifySwingCoverageFxAlignmentFlag.test.ts` ensures baseline has FX alignment distributions > 0.

## Commands executed
- `npm run audit:playbooks` → artifacts/coverage/audit-playbooks-l30-v1.txt (UTF-16LE)
- `npm run audit:playbooks -- 60` → artifacts/coverage/audit-playbooks-l60-v1.txt
- `npm run phase0:baseline` → artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json
- `npx ts-node --project scripts/tsconfig.scripts.json scripts/verify-swing-coverage-clean.ts` → artifacts/coverage/verify-swing-coverage-clean-v2.{json,md}
- `npx vitest tests/coverage/verifySwingCoverageFxAlignmentFlag.test.ts`
- `npm run build`

## Swing-Coverage Check (v2)
- totalRows parsed: 238; swingRows (1d/1w eod/us_open/morning/(null)): 208.
- Violations (generic/fallback for swing): 0.
- WTI routes to `energy-swing-v0.1`: true.
- Silver routes to `metals-swing-v0.1`: true.
- fxAlignmentPresentInReport (from latest baseline): true — baseline shows alignmentDistribution for all FX assets with non-zero totals.

## Notes
- Intraday (1h) intentionally generic|non-swing.
- WTI/Silver use evaluateDefault; tuning possible später.
- If a new baseline is generated, fxAlignmentPresentInReport is recomputed against latest baseline in artifacts/phase0-baseline.

## Artefact paths (v2)
- Audit 30d: artifacts/coverage/audit-playbooks-l30-v1.txt
- Audit 60d: artifacts/coverage/audit-playbooks-l60-v1.txt
- Swing coverage JSON: artifacts/coverage/verify-swing-coverage-clean-v2.json
- Swing coverage MD: artifacts/coverage/verify-swing-coverage-clean-v2.md
- Phase0 baseline: artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json
