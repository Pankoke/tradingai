# Setup UX - Status

**Scope:** Setup/Perception Lab Setup Page UX (Header -> Scores -> Decision Summary -> Drivers -> Execution)
**Rules:** TS strict, kein `any`, i18n de/en, keine imperativen Trading-Empfehlungen, Docs werden nach jedem Slice aktualisiert.
**Last update:** 2026-02-09
**Roadmap status:** COMPLETE (Stories 1-8 DONE; canonical UX stabilized)

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
- Status: DONE
- Notes:
  - Wiederverwendbare Komponente `DecisionSummaryCard` implementiert (nur UI-Layer, keine Seitenintegration).
  - Rendert Header (Titel, Band, Execution-Mode), Interpretation, Pros/Cautions, optional ReasonsAgainst.
  - Disclaimer-Microcopy integriert (short immer sichtbar, long per Tooltip).
  - Nutzt bestehende UI-Primitives (`Badge`, `Tooltip`) und ausschließlich i18n-Keys.
  - Component-Test deckt Titel/Disclaimer, Interpretation, Bullet-Rendering und optionalen ReasonsAgainst-Block ab.
- Files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: n/a (local change set)

### Story 4 - Integrate Decision Summary in Setup Page (Layer Order)
- Status: DONE
- Notes:
  - Canonical UX ist `SetupUnifiedCard` (Premium/SOTD); legacy Route `src/app/[locale]/setups/[id]/page.tsx` wurde in Cleanup 4.3 entfernt.
  - Decision Summary in Setup-Detailseite war zwischenzeitlich integriert via `toSetupViewModel` + `buildDecisionSummaryVM`.
  - Layer-Reihenfolge explizit umgesetzt: Header -> Scores -> Decision Summary -> Drivers -> Execution.
  - Failsafe integriert: bei Fehler in der Summary-Build-Phase wird die Card nicht gerendert, Seite bleibt stabil.
  - Page-Integrationstest verifiziert Rendering und DOM-Reihenfolge der Layer.
  - Story 4.1 (dev debug): DEV-only Debug-Box ergänzt, wenn Summary-VM nicht gebaut werden kann (mit Reason-Code, ohne sensitive Daten).
  - Story 4.2: Decision Summary in `SetupUnifiedCard` integriert (Premium/SOTD Sichtbarkeit), expanded-only zwischen Scores und Drivers.
  - Test deckt `expanded=true` (sichtbar) vs `expanded=false` (nicht sichtbar) für `SetupUnifiedCard` ab.
- Files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

### Cleanup 4.3 - Remove legacy setups/[id] route
- Status: DONE
- Notes:
  - Repo-weite Suche ergab keine produktive Nutzung von `setups/[id]`; nur Doku und route-spezifischer Test referenzierten den Pfad.
  - Legacy Route `src/app/[locale]/setups/[id]/page.tsx` entfernt.
  - Route-spezifischer Integrationstest `tests/components/setupDetailDecisionSummaryIntegration.test.ts` entfernt.
  - Canonical UI für Decision Summary bleibt `SetupUnifiedCard` (Premium/SOTD).
- Files:
  - `src/app/[locale]/setups/[id]/page.tsx` (removed)
  - `tests/components/setupDetailDecisionSummaryIntegration.test.ts` (removed)
  - `src/lib/mockSetups.ts`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

### Story 5 - Copy Quality Audit Fixes (konkrete Gruende statt generisch)
- Status: DONE
- Notes:
  - Generische Copy identifiziert in `src/messages/de.json` (`perception.signalQuality.reason.default`: "Standard-Ausrichtung der Kerntreiber.") und bisherigem Fallback-Rendering in `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`.
  - Neuer pure Helper `driverCopy.ts` erzeugt konkrete, deterministische Treiber-Bullets fuer Scores (Signalqualitaet/Konfidenz).
  - Bullets sind dedupliziert und auf max. 3 begrenzt.
  - Score-Layer in `SetupUnifiedCard` auf key+params-Bullets aus Helper umgestellt.
  - Neue i18n-Keys unter `setup.scoreDrivers.*` in de/en ergaenzt.
- Files:
  - `src/features/perception/viewModel/driverCopy.ts`
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/viewModel/driverCopy.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

### Story 6 - Mobile Setup Page (Progressive Disclosure)
- Status: DONE
- Notes:
  - In `SetupUnifiedCard` sind Driver-Details im `list`-Mode jetzt per Progressive Disclosure umgesetzt.
  - Layer-Verhalten bleibt klar: Scores + Decision Summary bleiben sichtbar, Drivers-Detailcontent ist initial eingeklappt.
  - Driver-Details werden ueber einen keyboard-accessible Trigger mit `aria-expanded` und `aria-controls` ein-/ausgeklappt.
  - Desktop/SOTD-Verhalten bleibt stabil: kein Disclosure-Trigger, Driver-Details bleiben direkt sichtbar.
  - Neue i18n-Keys fuer Disclosure-Labels in de/en ergaenzt.
  - Komponententest deckt initial collapsed, click-to-expand sowie SOTD ohne Trigger ab.
- Files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardMobileDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `package.json`
  - `package-lock.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

### Story 7 - Legal disclaimer integration (tooltip/modal + consistent)
- Status: DONE
- Notes:
  - Legal-safe Disclaimer-Microcopy in der Setup-UX konsolidiert verifiziert: `DecisionSummaryCard` zeigt weiterhin immer den kurzen Hinweis plus langen Tooltip-Hinweis.
  - Policy-as-code Guard-Test fuer i18n eingefuehrt (`de`/`en`) mit case-insensitive Regex + Wortgrenzen.
  - Guard scannt den Setup-UX Namespace (`setup.*`) und verhindert verbotene beratung/imperativ-nahe Begriffe.
  - Regex fuer `trade` in DE ist so gebaut, dass technische Begriffe wie `trade-off` nicht als Verbotstreffer zaehlen.
- Files:
  - `tests/i18n/legalCopyGuard.test.ts`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

### Story 8 - Execution Layer Progressive Disclosure (Premium Scan UX)
- Status: DONE
- Notes:
  - Execution-Layer in `SetupUnifiedCard` ist im `list`-Mode jetzt per Progressive Disclosure umgesetzt.
  - Initial sichtbar bleibt eine kompakte Execution-Summary-Row (Entry, Stop, Take-Profit, RRR).
  - Execution-Details sind in `list`-Mode initial eingeklappt und per keyboard-accessible Trigger mit `aria-expanded`/`aria-controls` oeffenbar.
  - SOTD/Desktop-Verhalten bleibt unveraendert: kein Trigger, Execution-Details direkt sichtbar.
  - Neue i18n-Keys fuer Trigger-Texte in de/en ergaenzt.
  - Component-Test deckt collapsed default, click-to-expand und SOTD-Default sichtbar ab.
- Files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-09

## Roadmap Complete
- Stories 1-8 are finalized as DONE.
- Canonical Setup UX is documented in:
  - `docs/setup-ux-spec-v1.md`
  - `docs/setup-ux-qa-checklist-v1.md`

### Story 10 - Decision Weight Rebalancing (Semantik & Informationsgewichtung)
- Status: DONE
- Notes:
  - Semantische Trennung im canonical UI verstaerkt: Scores als Eingangsmetriken, Decision Summary als Gesamtinterpretation.
  - Score-Layer in `SetupUnifiedCard` hat jetzt ein Section-Label + neutrale Hilfszeile (`setup.sections.inputMetrics*`).
  - `DecisionSummaryCard` hat jetzt ein semantisches Interpretations-Label + neutrale Hilfszeile (`setup.sections.overallInterpretation*`).
  - ARIA-Semantik ergaenzt (`aria-labelledby`/`aria-describedby`) ohne Redesign.
  - Tests erweitert fuer Input-Metrics-Label (list + sotd) und Overall-Interpretation-Label.
- Files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
- PR/Commit: local 2026-02-10

### Story 11 - Uncertainty Visibility (Decision Summary only)
- Status: DONE
- Notes:
  - `DecisionSummaryVM` um optionales Feld `uncertainty` erweitert (level + i18n key).
  - Deterministische Heuristik in `buildDecisionSummaryVM` implementiert, nur auf Basis bestehender VM-Daten:
    - reasonsAgainst vorhanden -> high
    - sonst cautions >= 2 -> medium
    - sonst cautions == 1 -> low
    - Mindestniveau medium bei `executionMode=wait` oder `band=C`
  - Uncertainty Marker als neutrales Badge im Header von `DecisionSummaryCard` gerendert.
  - i18n de/en fuer Label + low/medium/high ergaenzt.
  - VM- und Component-Tests um Uncertainty-Szenarien erweitert; legalCopyGuard bleibt Teil der grünen Suite.
- Files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/viewModel/decisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
- PR/Commit: local 2026-02-10

### Story 12 - Execution Neutralization (Copy + Semantik, ohne Redesign)
- Status: DONE
- Notes:
  - Execution-Layer in `SetupUnifiedCard` um neutrale Section-Semantik erweitert (`setup.execution.sectionTitle`, `levels.help`, `rrr.help`).
  - Kurzer, sichtbarer Execution-Disclaimer ergaenzt (`setup.execution.disclaimer.short`).
  - Execution-Copy (Entry/Stop/Target + Risk/Reward + Execution-Bullets) in `en/de` auf strukturell-neutrale Formulierungen umgestellt.
  - Keine Engine-/Datenaenderung, keine Disclosure-Logik-Aenderung, kein Redesign.
  - Component-Test deckt Disclaimer-Rendering im list- und sotd-Mode ab; legalCopyGuard bleibt gruen.
- Files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
- PR/Commit: local 2026-02-10

### Story 13 - Explainability Linking (ruhige, institutionelle Variante)
- Status: DONE
- Notes:
  - `DecisionSummaryVM` um optionales Feld `explainability` erweitert (existing key+params Struktur).
  - Explainability wird deterministisch aus vorhandenen `pros` und `cautions` abgeleitet (max 3, ohne neue Daten/Logikquellen).
  - In `DecisionSummaryCard` wurde eine ruhige Kontextzeile unter der Interpretation ergänzt:
    - `Based on: ...` / `Basierend auf: ...`
  - Keine neue Komponente, kein Redesign, keine Engine-Aenderung.
  - VM- und Component-Tests erweitert; legalCopyGuard bleibt gruen.
- Files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/viewModel/decisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
- PR/Commit: local 2026-02-10
