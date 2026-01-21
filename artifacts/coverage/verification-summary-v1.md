# Verification Summary (Phase-0 Swing Coverage / Audit)

Date: 2026-01-21

## Repo Facts (code references)
- Playbook resolver: `src/lib/engine/playbooks/index.ts` — non-swing profiles route generic only for explicit intraday/scalp patterns; FX/Index/Metals/Energy class and asset playbooks resolved before generic fallback; metals/energy matchers for silver/wti.
- Audit scripts: `scripts/audit-playbook-coverage.ts` (uses `resolvePlaybookWithReason`, snapshotTime window, label null→`(null)`); `scripts/capture-phase0-baseline.ts` (phase0 summaries → artifacts/phase0-baseline/*.json).
- Coverage verification: `scripts/verify-swing-coverage-clean.ts` parses audit outputs (UTF-16 aware) and checks swing violations.
- FX alignment helper/tests present (fxAlignmentModel & Distribution tests; renderer: `scripts/build-weekly-health-report.ts`, endpoint: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`).
- Tests located: `tests/playbooks/playbookResolverProfileFallback.test.ts`, `tests/phase0/fxAlignmentDistribution.test.ts`, `tests/phase0/weeklyReportRenderer.test.ts` (others for FX alignment/hygiene not executed in this run).

## Commands executed
- `npm run audit:playbooks` → artifacts/coverage/audit-playbooks-l30-v1.txt (UTF-16LE).
- `npm run audit:playbooks -- 60` → artifacts/coverage/audit-playbooks-l60-v1.txt.
- `npm run phase0:baseline` → artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json.
- `npx ts-node --project scripts/tsconfig.scripts.json scripts/verify-swing-coverage-clean.ts` → artifacts/coverage/verify-swing-coverage-clean-v1.{json,md}.
- `npm run build` (green).
- Targeted test: `npx vitest tests/playbooks/playbookResolverProfileFallback.test.ts` (green).

## Swing-Coverage Check (from verify-swing-coverage-clean-v1)
- totalRows parsed: 238; swingRows (1d/1w eod/us_open/morning/(null)): 208.
- Violations (generic/fallback for swing): 0.
- WTI routes to `energy-swing-v0.1`: true.
- Silver routes to `metals-swing-v0.1`: true.
- FX alignment present in latest baseline summaries: false (baseline JSON lacked alignmentDistribution keys for FX).
- Markdown summary: artifacts/coverage/verify-swing-coverage-clean-v1.md.

## Notes / Gaps
- Baseline used for FX alignment flag does not show alignmentDistribution → flag false; requires fresh phase0 baseline/run with alignment enabled to confirm.
- Intraday (1h) intentionally remains `generic-swing-v0.1 | non-swing profile` (not treated as violation).
- WTI/Silver still use generic evaluation logic (evaluateDefault) but no generic fallback for swing routing.

## Artefact paths
- Audit 30d: artifacts/coverage/audit-playbooks-l30-v1.txt
- Audit 60d: artifacts/coverage/audit-playbooks-l60-v1.txt
- Swing coverage JSON: artifacts/coverage/verify-swing-coverage-clean-v1.json
- Swing coverage MD: artifacts/coverage/verify-swing-coverage-clean-v1.md
- Phase0 baseline: artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json
