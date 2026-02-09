# Setup UX QA Checklist v1

## Scope
Canonical Setup UX based on `SetupUnifiedCard` for Premium list and SOTD.

## 1) List Mode Baseline (Premium Scan)
- [ ] Card initial view is compact (reduced scroll compared to fully expanded details)
- [ ] Drivers details are collapsed by default
- [ ] Execution details are collapsed by default
- [ ] Execution summary row is visible by default (Entry, Stop, Take-Profit, RRR)

## 2) Progressive Disclosure Behavior
- [ ] Drivers toggle is visible in list mode
- [ ] Drivers toggle opens/closes details correctly
- [ ] Execution toggle is visible in list mode
- [ ] Execution toggle opens/closes details correctly
- [ ] Expanded content matches previous detail content (no missing data blocks)

## 3) Accessibility Checks
- [ ] Drivers trigger reachable via keyboard (Tab/Shift+Tab)
- [ ] Execution trigger reachable via keyboard (Tab/Shift+Tab)
- [ ] Drivers trigger exposes correct `aria-expanded` state
- [ ] Drivers trigger references valid `aria-controls` target
- [ ] Execution trigger exposes correct `aria-expanded` state
- [ ] Execution trigger references valid `aria-controls` target

## 4) Expanded Card Behavior
- [ ] Decision Summary is visible when card is expanded
- [ ] Decision Summary disclaimer short text is visible
- [ ] Decision Summary long disclaimer is available via tooltip interaction
- [ ] Layer order remains: Header -> Scores -> Decision Summary -> Drivers -> Execution

## 5) NO_TRADE / BLOCKED Scenarios
- [ ] Decision Summary still renders safely
- [ ] `reasonsAgainst` block appears when provided
- [ ] No crash when optional fields are missing

## 6) Language and i18n Checks (de/en)
- [ ] Setup UX labels render correctly in `de`
- [ ] Setup UX labels render correctly in `en`
- [ ] No hardcoded Setup-UX strings added outside i18n keys

## 7) Legal-Safe Governance
- [ ] Legal guard test passes:
  - `tests/i18n/legalCopyGuard.test.ts`
- [ ] DecisionSummary disclaimer text remains neutral and non-directive

## 8) Regression Test Set (minimum)
- [ ] `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
- [ ] `tests/components/SetupUnifiedCardMobileDisclosure.test.ts`
- [ ] `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
- [ ] `tests/components/DecisionSummaryCard.test.ts`
- [ ] `tests/viewModel/decisionSummary.test.ts`
- [ ] `tests/viewModel/driverCopy.test.ts`
- [ ] `tests/i18n/legalCopyGuard.test.ts`
