## Playbook Coverage Report (Phase-0 baseline)

Date: generated after fixing profile guard (see `src/lib/engine/playbooks/index.ts`).

### Registry (src/lib/engine/playbooks/index.ts)
- Asset-specific: `gold-swing-v0.2`, `spx-swing-v0.1`, `dax-swing-v0.1`, `ndx-swing-v0.1`, `dow-swing-v0.1`, `eurusd-swing-v0.1`, `gbpusd-swing-v0.1`, `usdjpy-swing-v0.1`, `eurjpy-swing-v0.1`.
- Class-level: `index-swing-v0.1`, `crypto-swing-v0.1`, `fx-swing-v0.1`, `generic-swing-v0.1`.
- Resolver inputs: `asset.id/symbol/name` plus optional `profile` string. Rings/levels are only used by playbooks after routing.

### Resolver logic (key points)
- If `profile` explicitly contains an intraday pattern (`intraday`, `daytrade`, `day_trade`, `scalp`, `shortterm`, `short_term`) → `generic-swing-v0.1` with reason `non-swing profile`.
- Otherwise resolution order: SPX → DAX → NDX → DOW → Gold → Index (caret/keyword) → Crypto (USDT/USD tails) → FX specific IDs (eurusd/gbpusd/usdjpy/eurjpy) → FX class (6-letter USD pairs) → Generic fallback.
- Change vs previous: empty or non-intraday profiles no longer force the generic “non-swing profile” route, enabling FX asset playbooks for snapshots that carried empty/position profiles.

### Audit script (scripts/audit-playbook-coverage.ts)
- Scans `perceptionSnapshots` last N days (default 30) using `snapshotTime`.
- Normalises keys to lowercase `(assetId, timeframe, label)`; label `null` → `(null)`.
- Resolves playbook via `resolvePlaybookWithReason` using `setup.assetId/symbol/name` and `setup.profile`.
- Output: markdown table of playbook chosen per asset/timeframe/label.

### Current audit highlights (after guard + resolver reorder)
- 1D swing labels (eod/us_open/morning/(null)) route to asset FX playbooks (eurusd/gbpusd/usdjpy/eurjpy) and index-specific playbooks; gold/crypto unchanged.
- 1W swing labels now resolve to their asset playbooks (gold/index/FX/crypto) instead of generic. Intraday still uses `generic-swing-v0.1 | non-swing profile` (intended).
- WTI/Silver still fall back to `generic-swing-v0.1` (no dedicated class playbook yet).

### Missing coverage / next steps
- Weekly (1W) setups: decide whether to treat as swing; if yes, adjust resolver to treat weekly profiles as swing-default.
- Commodity/Energy class playbooks (e.g. WTI, Silver) are absent; either add asset-specific or class `metals/energy-swing` playbooks to avoid generic.
- Consider adding class playbooks for weekly profiles if they should differ from daily swing.

### How to reproduce
```
npm run audit:playbooks           # default 30 days
npm run audit:playbooks -- 60     # custom window
```

### Acceptance target
- For swing timeframes (1D/1W) and labels (eod/us_open/morning/(null)), resolver should pick asset-specific or class playbooks when available, not `generic-swing-v0.1 | non-swing profile`.
