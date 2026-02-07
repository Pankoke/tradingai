# Swing 4H Refinement Verification (read-only)

Quelle: perception_snapshots (DB), Zeitraum: letzte 60 Tage
Abfragezeit: 2026-02-07T16:37:18.578Z

## Kennzahlen (gesamt)
- Setups total: 957
- refinementAttempted: 4 (0.4%)
- refinementUsed: 0
- refinementApplied: 0 (0%)
- attempt→applied conversion: 0%
- boundsMode ATR1D/PCT: 0/0
### Alerts
- refinementAppliedRate < 5%: Not effective yet (moegliche Ursachen: fehlende 4H-Candles, Freshness-Gate, Telemetry nicht vorhanden, ATR-Bounds zu strikt).

## Decision Coupling Check
- dax: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(59) [TRADE: 7 (11.9%), WATCH: 2 (3.4%), NO_TRADE: 50 (84.7%), BLOCKED: 0 (0%)]
- dow: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(58) [TRADE: 4 (6.9%), WATCH: 11 (19%), NO_TRADE: 43 (74.1%), BLOCKED: 0 (0%)]
- eth: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(64) [TRADE: 0 (0%), WATCH: 43 (67.2%), NO_TRADE: 21 (32.8%), BLOCKED: 0 (0%)]
- eurjpy: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(61) [TRADE: 6 (9.8%), WATCH: 34 (55.7%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- eurusd: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(61) [TRADE: 0 (0%), WATCH: 40 (65.6%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- gbpusd: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(61) [TRADE: 33 (54.1%), WATCH: 7 (11.5%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- gold: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(61) [TRADE: 0 (0%), WATCH: 40 (65.6%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- ndx: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(58) [TRADE: 0 (0%), WATCH: 10 (17.2%), NO_TRADE: 48 (82.8%), BLOCKED: 0 (0%)]
- silver: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(176) [TRADE: 78 (44.3%), WATCH: 0 (0%), NO_TRADE: 98 (55.7%), BLOCKED: 0 (0%)]
- spx: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(58) [TRADE: 2 (3.4%), WATCH: 12 (20.7%), NO_TRADE: 44 (75.9%), BLOCKED: 0 (0%)]
- usdjpy: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(61) [TRADE: 31 (50.8%), WATCH: 9 (14.8%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- wti: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(179) [TRADE: 137 (76.5%), WATCH: 0 (0%), NO_TRADE: 42 (23.5%), BLOCKED: 0 (0%)]

## Refinement Reasons Breakdown
- dax: missing:59
- dow: missing:58
- eth: missing:64
- eurjpy: missing:61
- eurusd: missing:61
- gbpusd: missing:61
- gold: missing:61
- ndx: missing:58
- silver: missing:176
- spx: missing:58
- usdjpy: missing:61
- wti: missing:179

## Bounds Mode Breakdown
- dax: ATR1D=0, PCT=0
- dow: ATR1D=0, PCT=0
- eth: ATR1D=0, PCT=0
- eurjpy: ATR1D=0, PCT=0
- eurusd: ATR1D=0, PCT=0
- gbpusd: ATR1D=0, PCT=0
- gold: ATR1D=0, PCT=0
- ndx: ATR1D=0, PCT=0
- silver: ATR1D=0, PCT=0
- spx: ATR1D=0, PCT=0
- usdjpy: ATR1D=0, PCT=0
- wti: ATR1D=0, PCT=0

## Per-Asset Tabelle
| assetId | playbookId | TRADE | WATCH | NO_TRADE | BLOCKED | top 3 reasons | has4H | refinement applied/used | p50 entryDelta | p90 entryDelta | bounds ATR/PCT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dax | dax-swing-v0.1 | 11.9% (7) | 3.4% (2) | 84.7% (50) | 0% (0) | Regime range/chop (trend confirmation missing) (35); spx:WATCH_RANGE_CONSTRUCTIVE (35); Regime TREND (7) | no | 0/0 | n/a | n/a | 0/0 |
| dow | dow-swing-v0.1 | 6.9% (4) | 19% (11) | 74.1% (43) | 0% (0) | Regime range/chop (trend confirmation missing) (29); spx:WATCH_RANGE_CONSTRUCTIVE (29); Alignment derived (index fallback LONG) (11) | no | 0/0 | n/a | n/a | 0/0 |
| eth | crypto-swing-v0.1 | 0% (0) | 67.2% (43) | 32.8% (21) | 0% (0) | Regime range / chop (43); crypto:g1_regime:RANGE (43); Regime range/chop (trend confirmation missing) (4) | yes | 0/0 | n/a | n/a | 0/0 |
| eurjpy | eurjpy-swing-v0.1 | 9.8% (6) | 55.7% (34) | 34.4% (21) | 0% (0) | Alignment fx LONG (34); Derived alignment LONG; bias/trend below defaults (21); Alignment derived (LONG) from bias/trend (21) | no | 0/0 | n/a | n/a | 0/0 |
| eurusd | eurusd-swing-v0.1 | 0% (0) | 65.6% (40) | 34.4% (21) | 0% (0) | Derived alignment SHORT; bias/trend below defaults (44); Alignment derived (SHORT) from bias/trend (44); Alignment fx SHORT (40) | no | 0/0 | n/a | n/a | 0/0 |
| gbpusd | gbpusd-swing-v0.1 | 54.1% (33) | 11.5% (7) | 34.4% (21) | 0% (0) | Default alignment: bias & trend supportive (33); Derived alignment LONG; bias/trend below defaults (11); Alignment derived (LONG) from bias/trend (11) | no | 0/0 | n/a | n/a | 0/0 |
| gold | gold-swing-v0.2 | 0% (0) | 65.6% (40) | 34.4% (21) | 0% (0) | Bias too weak (<70) (44); base:bias+signalQuality (26); base:bias+trend+signalQuality (14) | no | 0/0 | n/a | n/a | 0/0 |
| ndx | ndx-swing-v0.1 | 0% (0) | 17.2% (10) | 82.8% (48) | 0% (0) | Regime range/chop (trend confirmation missing) (34); spx:WATCH_RANGE_CONSTRUCTIVE (34); Alignment derived (index fallback SHORT) (10) | no | 0/0 | n/a | n/a | 0/0 |
| silver | metals-swing-v0.1 | 44.3% (78) | 0% (0) | 55.7% (98) | 0% (0) | silver id (81); Default alignment: bias & trend supportive (78); Alignment derived (SHORT) from bias/trend (58) | no | 0/0 | n/a | n/a | 0/0 |
| spx | spx-swing-v0.1 | 3.4% (2) | 20.7% (12) | 75.9% (44) | 0% (0) | Regime range/chop (trend confirmation missing) (30); spx:WATCH_RANGE_CONSTRUCTIVE (30); Alignment derived (index fallback LONG) (12) | no | 0/0 | n/a | n/a | 0/0 |
| usdjpy | usdjpy-swing-v0.1 | 50.8% (31) | 14.8% (9) | 34.4% (21) | 0% (0) | Default alignment: bias & trend supportive (31); Derived alignment LONG; bias/trend below defaults (13); Alignment derived (LONG) from bias/trend (13) | no | 0/0 | n/a | n/a | 0/0 |
| wti | energy-swing-v0.1 | 76.5% (137) | 0% (0) | 23.5% (42) | 0% (0) | Default alignment: bias & trend supportive (137); Alignment derived (LONG) from bias/trend (22); Derived alignment LONG; bias/trend below defaults (22) | no | 0/0 | n/a | n/a | 0/0 |
