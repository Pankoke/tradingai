## Playbook Coverage Report (Phase-0 baseline)

Date: after profile guard fixes, Metals/Energy class playbooks, and swing cleanup (`src/lib/engine/playbooks/index.ts`).

### Registry (src/lib/engine/playbooks/index.ts)
- Asset-specific: `gold-swing-v0.2`, `spx-swing-v0.1`, `dax-swing-v0.1`, `ndx-swing-v0.1`, `dow-swing-v0.1`, `eurusd-swing-v0.1`, `gbpusd-swing-v0.1`, `usdjpy-swing-v0.1`, `eurjpy-swing-v0.1`.
- Class-level: `index-swing-v0.1`, `crypto-swing-v0.1`, `fx-swing-v0.1`, `metals-swing-v0.1`, `energy-swing-v0.1`, `generic-swing-v0.1`.
- Resolver inputs: `asset.id/symbol/name` plus optional `profile` string. Rings/levels werden erst im Playbook genutzt.

### Resolver logic (key points)
- Intraday guard: if `profile` contains an intraday hint (`intraday`, `daytrade`, `day_trade`, `scalp`, `shortterm`, `short_term`) -> `generic-swing-v0.1` with reason `non-swing profile`.
- Otherwise order: SPX -> DAX -> NDX -> DOW -> Gold -> Index (caret/keyword) -> Crypto (USDT/USD tails) -> FX specific IDs (eurusd/gbpusd/usdjpy/eurjpy) -> FX class (6-letter USD pairs) -> Metals class (e.g., silver) -> Energy class (e.g., wti) -> Generic fallback.
- Profiles that are empty/non-intraday now stay on the swing path, enabling FX/Metals/Energy playbooks.

### Audit script (scripts/audit-playbook-coverage.ts)
- Scans `perceptionSnapshots` last N days (default 30) via `snapshotTime`.
- Normalises `(assetId, timeframe, label)` to lowercase; `null` label -> `(null)`.
- Resolves via `resolvePlaybookWithReason` using `setup.assetId/symbol/name` and `setup.profile`.
- Output: Markdown table of playbook per asset/timeframe/label.

### Current audit highlights (after Metals/Energy classes)
- Swing 1D/1W with labels eod/us_open/morning/(null): routed to asset- or class-playbooks (FX/Index/Crypto/Metals/Energy); no generic/fallback for swing.
- Intraday 1H intentionally `generic-swing-v0.1 | non-swing profile`.
- WTI -> `energy-swing-v0.1`, Silver -> `metals-swing-v0.1` (Swing).

### How to reproduce
```
npm run audit:playbooks           # default 30 days
npm run audit:playbooks -- 60     # custom window
```

### Acceptance target
- Swing timeframes (1D/1W) and labels (eod/us_open/morning/(null)) should pick asset- or class-playbooks, not `generic-swing-v0.1 | non-swing profile`. Intraday 1H may remain generic.
