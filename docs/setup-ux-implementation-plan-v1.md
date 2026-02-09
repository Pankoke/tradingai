# Setup UX - Implementation Plan v1

## Story 1 - Enhanced Setup Header (Data Mode & Timestamps)
- Status: Implemented
- Scope delivered:
  - Data mode badge in setup detail header (`Live` / `Mock (demo data)`).
  - Time context labels in header (`Generated` and `As of`).
  - Neutral tooltip clarifying Generated vs As of.
  - Optional context badges for `Backtest` / `Playback` only when reliably inferable.
  - Unit test for mode label key mapping (`live` vs `mock`).
- Changed files:
  - `src/app/[locale]/setups/[id]/page.tsx`
  - `src/lib/config/perceptionDataMode.ts`
  - `src/lib/mockSetups.ts`
  - `tests/viewModel/setupHeaderModeLabel.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 2 - Decision Summary Data Model & Heuristics (pure TS)
- Status: Implemented
- Scope delivered:
  - Pure function `buildDecisionSummaryVM(input)` implemented with deterministic heuristics.
  - New typed VM contracts for interpretation/band/execution mode/pros/cautions/reasonsAgainst.
  - Heuristic mapping from existing setup signals (grade, decision, rings, signalQuality, rrr, event modifier).
  - Unit test suite with five scenarios (strong setup, confirmation required, NO_TRADE reasons, event critical, weak RRR).
  - i18n keys under `setup.decisionSummary.*` added for de/en.
- Changed files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `tests/viewModel/decisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 3 - Decision Summary UI Component (Card + i18n + disclaimer)
- Status: TODO

## Story 4 - Integrate Decision Summary in Setup Page (Layer Order)
- Status: TODO

## Story 5 - Copy Quality Audit Fixes
- Status: TODO

## Story 6 - Mobile Setup Page (Progressive Disclosure)
- Status: TODO

## Story 7 - Legal disclaimer integration
- Status: TODO

## Story 8 - Copy lint / tests
- Status: TODO
