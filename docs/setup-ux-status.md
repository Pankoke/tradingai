# Setup UX - Status

**Scope:** Setup/Perception Lab Setup Page UX (Header -> Scores -> Decision Summary -> Drivers -> Execution)
**Rules:** TS strict, kein `any`, i18n de/en, keine imperativen Trading-Empfehlungen, Docs werden nach jedem Slice aktualisiert.
**Last update:** 2026-02-09

## Definition of Done (pro Story)
- Build/Lint/Typecheck gruen (soweit im Repo vorhanden)
- i18n Keys (de/en) ergaenzt (keine Hardcodes)
- Tests ergaenzt/aktualisiert (mindestens Unit fuer pure Logic)
- Docs aktualisiert:
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Roadmap / Stories

### Story 1 - Enhanced Setup Header (Data Mode & Timestamps)
- Status: DONE
- Ziel: Setup-Header zeigt klar Live/Mock (ggf. Backtest/Playback), sowie `Generated` vs `As of`.
- Notes:
  - Header auf `src/app/[locale]/setups/[id]/page.tsx` um neutralen Datenmodus-Badge erweitert (`Live`/`Mock (demo data)`).
  - Zeitkontext ergaenzt: `Generated` (snapshotCreatedAt) und `As of` (ring-meta `asOf` bzw. snapshotTime fallback) inkl. Tooltip.
  - Optionale Kontext-Badges (`Backtest`/`Playback`) werden nur gezeigt, wenn Labels eindeutig darauf hindeuten.
  - Mock-Setups liefern jetzt konsistente Zeitmetadaten fuer Header-Anzeige.
  - Mode-Label-Logik wurde als Unit-Test abgesichert.
- Files:
  - `src/app/[locale]/setups/[id]/page.tsx`
  - `src/lib/config/perceptionDataMode.ts`
  - `src/lib/mockSetups.ts`
  - `tests/viewModel/setupHeaderModeLabel.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit:

### Story 2 - Decision Summary Data Model & Heuristics (pure TS)
- Status: DONE
- Notes:
  - Neuer, deterministischer und pure ViewModel-Layer `buildDecisionSummaryVM(input)` implementiert.
  - Ausgabe umfasst: `interpretation` (key + params), `band` (A/B/C), `executionMode`, `pros`, `cautions`, optionale `reasonsAgainst`.
  - Heuristiken nutzen nur bestehende Setup-/Engine-Felder (grade/decision, rings, signalQuality, riskReward, eventModifier, decision reasons).
  - Bullet-Listen sind auf max. 3 Eintraege begrenzt und dedupliziert.
  - Keine UI-Änderungen in Story 2.
- Files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `tests/viewModel/decisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit:

### Story 3 - Decision Summary UI Component (Card + i18n + disclaimer)
- Status: TODO
- Notes:
- Files:
- PR/Commit:

### Story 4 - Integrate Decision Summary in Setup Page (Layer Order)
- Status: TODO
- Notes:
- Files:
- PR/Commit:

### Story 5 - Copy Quality Audit Fixes (konkrete Gruende statt generisch)
- Status: TODO
- Notes:
- Files:
- PR/Commit:

### Story 6 - Mobile Setup Page (Progressive Disclosure)
- Status: TODO
- Notes:
- Files:
- PR/Commit:

### Story 7 - Legal disclaimer integration (tooltip/modal + consistent)
- Status: TODO
- Notes:
- Files:
- PR/Commit:

### Story 8 - Copy lint / tests (verbotene Begriffe de/en)
- Status: TODO
- Notes:
- Files:
- PR/Commit:
