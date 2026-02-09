# Setup UX Spec v1

## Purpose
This document defines the canonical Setup UX behavior to keep future changes consistent.

## Canonical UI
- Canonical rendering surface: `SetupUnifiedCard`
- Primary contexts:
  - Premium list scan (`mode="list"`)
  - Setup of the Day (`mode="sotd"`)

## Layer Order
The canonical layer order is fixed:
1. Header
2. Scores
3. Decision Summary
4. Drivers
5. Execution

## List Mode Progressive Disclosure
List mode is optimized for scan speed and reduced initial scroll.

### Drivers
- Default state: collapsed
- Ring header/score area stays visible
- Detailed insight content is hidden until user opens it
- Toggle behavior:
  - explicit user action required
  - keyboard-accessible trigger
  - `aria-expanded` and `aria-controls` wired

### Execution
- Default state: collapsed (details)
- Always-visible execution summary row:
  - Entry range
  - Stop range
  - Take-Profit range
  - RRR (if available; otherwise fallback)
- Toggle behavior:
  - explicit user action required
  - keyboard-accessible trigger
  - `aria-expanded` and `aria-controls` wired

## Desktop / SOTD Behavior
- Details are visible by default
- No progressive-disclosure toggles for drivers/execution in SOTD flow
- Full layer order remains active and unchanged

## Legal-Safe Copy Requirements
- Decision Summary contains a visible short disclaimer and a long explanatory tooltip text
- Copy remains neutral and non-directive
- i18n-only labels/texts for Setup UX changes
- Automated guard test enforces forbidden advisory/imperative terms in Setup namespace:
  - `tests/i18n/legalCopyGuard.test.ts`

## Non-Goals (for this spec)
- No heuristics redesign (`buildDecisionSummaryVM` remains source of truth)
- No visual redesign of existing card system
- No alternate canonical detail route outside `SetupUnifiedCard`
