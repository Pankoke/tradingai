# Review Report

A) Executive Summary
- Critical: Clerk middleware is implemented but not wired (no middleware.ts), so intended admin protections may not run; combined with weak auth checks this enables bypass risk.
- High: Perception snapshot generation ignores the requested asOf date and uses latest candles/bias data, which breaks determinism and can introduce look-ahead bias in backtests.
- High: /api/bias/today always returns mock data even in live mode, so signals can be driven by non-live bias.
- Medium: Domain engine code depends on server/db modules, blurring boundaries and making testing/edge portability harder.
- Medium: Strict TS is undermined by explicit any/unsafe casts in core logic and UI, increasing runtime error risk.
- Medium: Root layout hardcodes lang=de and default metadata, so locale pages render incorrect language/SEO metadata.
- Medium: External provider fetches (Binance) lack throttling/timeouts; numeric fields are not validated against schema drift.
- Medium: Internal fetcher omits cache control, so server components may serve stale live data.
- Medium: Cron endpoints (marketdata/events/outcomes) lack idempotency/locking; overlapping runs can duplicate work.
- Medium: No CI workflow for lint/typecheck/tests; regressions can merge silently.
- Low: Stack declaration says Next.js 15 but package.json pins Next 16.
- Low: Intraday marketdata cron logs binance usage as false even when true.

B) Findings-Tabelle
| ID | Kategorie | Schweregrad | Ort | Beschreibung | Impact | Empfehlung (konkret, ohne Code) | Aufwand |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | Security | Critical | src/proxy.ts:1-94 | Clerk middleware and admin protections exist but are not in a Next.js middleware entrypoint. Assumption: without middleware.ts, these checks never run. | Admin routes can be reachable without the intended auth/redirect logic. | Rename/relocate this file to Next.js middleware conventions and verify it executes in production. Done: middleware runs on a test request and blocks unauthorized admin access. | S |
| F-002 | Security | High | src/app/api/admin/playbooks/thresholds/simulate/route.ts:11-23 | Auth check treats presence of __session cookie or x-clerk-auth-status header as authenticated without verifying the session. | Spoofed headers/cookies can bypass admin auth if middleware is not enforcing Clerk verification. | Use Clerk server auth (auth()/getAuth()) or require ADMIN_API_TOKEN for admin APIs. Done: fake cookies/headers do not authorize requests. | M |
| F-003 | Trading-Domain | High | src/lib/engine/perceptionDataSource.ts:120-149, 452-463; src/lib/engine/perceptionEngine.ts:234-246 | asOf is passed into buildPerceptionSnapshot but LivePerceptionDataSource ignores it and uses new Date() + latest candles. | Non-deterministic snapshots and look-ahead bias in backtesting; inconsistent signals between runs. | Thread asOf through data source and time-bound candle/bias queries to snapshotTime. Done: identical asOf input yields identical outputs. | M |
| F-004 | Trading-Domain | High | src/app/api/bias/today/route.ts:1-8 | Bias endpoint always returns mockBiasSnapshot without checking live/mock mode. | Live UI and signals can rely on mock bias data. | Serve live bias snapshots when not in mock mode. Done: endpoint returns DB-backed bias in live mode. | S |
| F-005 | Architecture | Medium | src/lib/engine/perceptionEngine.ts:1-19; src/lib/engine/perceptionDataSource.ts:8-24 | Core engine depends on server repositories/providers (DB, external APIs). | Tight coupling makes domain logic harder to test, reuse, and move to edge/runtime contexts. | Invert dependencies: pass data adapters into engine or move data-fetching to server layer. Done: lib/engine has no direct server imports. | L |
| F-006 | TypeScript | Medium | src/lib/engine/perceptionEngine.ts:313; src/components/perception/RiskRewardBlock.tsx:100-106; src/server/admin/systemHealth.ts:151-155; src/lib/engine/playbooks/index.ts:465,588 | Explicit any and unsafe casts in strict TS paths. | Type holes can hide runtime bugs and violate strict typing goals. | Replace with proper types/guards and remove any/unknown casts. Done: these files compile with strict TS and no explicit any/unknown casts. | M |
| F-007 | Next.js | Medium | src/app/layout.tsx:32-44 | Root layout hardcodes lang="de" and metadata from defaultLocale only. | Incorrect language metadata for EN locale; SEO and a11y impact. | Move lang/metadata to locale-aware layout or generateMetadata per locale. Done: html lang and metadata follow requested locale. | S |
| F-008 | API-Resilience | Medium | src/server/marketData/binanceMarketDataProvider.ts:66-88 | Binance provider uses raw fetch without throttling, timeouts, or retries. | Cron jobs may hang or get rate-limited, causing partial/inconsistent data. | Use shared throttler and add timeout/retry/backoff. Done: provider uses throttler and aborts on timeout. | M |
| F-009 | API-Resilience | Medium | src/server/marketData/twelvedataMarketDataProvider.ts:106-118 | External API payload fields are not validated beyond basic parsing. | Schema drift or invalid values can inject NaN data into candles and downstream metrics. | Add schema validation and filter invalid numeric values before persistence. Done: invalid/missing fields are rejected and logged. | M |
| F-010 | Next.js | Medium | src/lib/fetcher.ts:21-30 | fetcher omits cache control, so server fetches may be cached by default. | Live signals can appear stale or inconsistent across requests. | Add cache controls (no-store or revalidate) where used for live data. Done: fetcher uses explicit cache policy. | S |
| F-011 | Testing | Medium | .github/workflows/*.yml | Repo lacks CI workflow for lint/typecheck/tests; only cron workflows exist. | Regressions can merge without gates. | Add CI workflow to run lint, typecheck, and tests on PRs. Done: CI required and green before merge. | M |
| F-012 | Deployment | Medium | src/app/api/cron/marketdata/sync/route.ts:1-85; src/app/api/cron/events/ingest/route.ts:1-90; src/app/api/cron/outcomes/evaluate/route.ts:1-110 | Most cron endpoints lack idempotency or locking; only intraday perception uses a DB lock. | Overlapping cron runs can double-write or overload external APIs. | Add idempotency keys or advisory locks per cron route. Done: parallel runs are rejected or coalesced. | M |
| F-013 | Observability | Low | src/app/api/cron/marketdata/intraday/route.ts:59-190 | Logging always reports binanceUsed: false even when true. | Misleading monitoring/diagnostics. | Log actual binanceUsed flag or remove the message. Done: log reflects real provider usage. | S |
| F-014 | Maintainability | Low | package.json:41,57 | Stack states Next.js 15, but dependencies pin Next 16 and eslint-config-next 16. | Version mismatch can introduce unexpected behavior or upgrade drift. | Align documented stack with dependencies or update docs to Next 16. Done: declared stack matches package.json. | S |

C) Prioritaetenplan (Top 10)
1) F-001 (Risk: Wahrscheinlichkeit Hoch x Schaden Hoch). Begruendung: gating control for admin routes; broad security impact. Abhaengigkeiten: None.
2) F-002 (Risk: Wahrscheinlichkeit Mittel x Schaden Hoch). Begruendung: admin auth can be bypassed if middleware not active. Abhaengigkeiten: F-001.
3) F-003 (Risk: Wahrscheinlichkeit Hoch x Schaden Hoch). Begruendung: determinism/backtest validity is core to trading analytics. Abhaengigkeiten: None.
4) F-004. Begruendung: bias data correctness directly affects signals. Abhaengigkeiten: None.
5) F-012. Begruendung: cron overlap can corrupt data or create partial snapshots. Abhaengigkeiten: None.
6) F-010. Begruendung: stale fetch caching can surface incorrect live signals. Abhaengigkeiten: None.
7) F-008. Begruendung: provider timeouts/rate limits affect data freshness. Abhaengigkeiten: F-012 optional.
8) F-009. Begruendung: schema drift can silently poison metrics. Abhaengigkeiten: None.
9) F-006. Begruendung: removes type holes in core paths. Abhaengigkeiten: None.
10) F-011. Begruendung: add quality gates to prevent regression. Abhaengigkeiten: None.

D) Evidence Appendix
- Key files reviewed: package.json, tsconfig.json, eslint.config.mjs, vitest.config.ts, src/app/layout.tsx, src/app/[locale]/layout.tsx, src/proxy.ts, src/lib/engine/perceptionEngine.ts, src/lib/engine/perceptionDataSource.ts, src/features/perception/build/buildSetups.ts, src/server/marketData/*, src/server/services/outcomeEvaluator.ts, src/server/services/outcomeEvaluationRunner.ts, src/app/api/cron/*, src/app/api/admin/*, src/app/api/bias/today/route.ts.
- End-to-end flows traced:
  - External market data -> candleRepository -> perception engine -> snapshot store -> /api/perception/today -> UI (PerceptionTodayPanel).
  - Events ingest (jb-news) -> enrich AI -> eventRepository -> event ring scoring -> UI event context.
  - Outcomes evaluation cron -> snapshot selection -> candle windows -> outcome upsert -> admin exports.
- Phase notes (checked / findings / evidence):
  - Phase 1: Checked structure, configs, app router, tests, workflows. Findings: F-007, F-011, F-014. Evidence: src/app/layout.tsx:32-44, .github/workflows/*.yml, package.json:41,57.
  - Phase 2: Checked boundaries between lib/engine, server, features. Findings: F-005. Evidence: src/lib/engine/perceptionEngine.ts:1-19, src/lib/engine/perceptionDataSource.ts:8-24.
  - Phase 3: Checked type safety, runtime validation usage. Findings: F-006, F-009. Evidence: src/components/perception/RiskRewardBlock.tsx:100-106, src/server/admin/systemHealth.ts:151-155, src/lib/engine/playbooks/index.ts:465,588, src/server/marketData/twelvedataMarketDataProvider.ts:106-118.
  - Phase 4: Checked App Router correctness, metadata, caching. Findings: F-007, F-010. Evidence: src/app/layout.tsx:32-44, src/lib/fetcher.ts:21-30.
  - Phase 5: Checked external APIs, rate limits, retries. Findings: F-008, F-009. Evidence: src/server/marketData/binanceMarketDataProvider.ts:66-88, src/server/marketData/twelvedataMarketDataProvider.ts:106-118.
  - Phase 6: Checked auth, Clerk integration, admin guards. Findings: F-001, F-002. Evidence: src/proxy.ts:1-94, src/app/api/admin/playbooks/thresholds/simulate/route.ts:11-23.
  - Phase 7: Checked trading/backtesting determinism and bias risks. Findings: F-003, F-004. Evidence: src/lib/engine/perceptionDataSource.ts:120-149, 452-463; src/lib/engine/perceptionEngine.ts:234-246; src/app/api/bias/today/route.ts:1-8.
  - Phase 8: Checked tests and quality gates. Findings: F-011. Evidence: .github/workflows/*.yml.
  - Phase 9: Checked performance/UX/a11y. Findings: F-007 (lang/meta). Evidence: src/app/layout.tsx:32-44.
  - Phase 10: Checked deployment/cron. Findings: F-012, F-013. Evidence: src/app/api/cron/marketdata/sync/route.ts:1-85, src/app/api/cron/events/ingest/route.ts:1-90, src/app/api/cron/outcomes/evaluate/route.ts:1-110, src/app/api/cron/marketdata/intraday/route.ts:59-190.
