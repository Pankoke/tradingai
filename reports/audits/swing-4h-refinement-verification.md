# Swing 4H Refinement Verification (read-only)

Quelle: perception_snapshots (DB), Zeitraum: letzte 60 Tage
Abfragezeit: 2026-02-07T18:52:51.434Z

## Kennzahlen (gesamt)
- Setups total: 1026
- refinementAttempted: 73 (7.1%)
- refinementUsed: 19
- refinementApplied: 19 (100%)
- attempt→applied conversion: 26%
- boundsMode ATR1D/PCT: 19/0
## Decision Coupling Check
- btc: applied(1) [TRADE: 0 (0%), WATCH: 1 (100%), NO_TRADE: 0 (0%), BLOCKED: 0 (0%)] | notApplied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0]
- dax: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(64) [TRADE: 7 (10.9%), WATCH: 2 (3.1%), NO_TRADE: 55 (85.9%), BLOCKED: 0 (0%)]
- dow: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(63) [TRADE: 4 (6.3%), WATCH: 11 (17.5%), NO_TRADE: 48 (76.2%), BLOCKED: 0 (0%)]
- eth: applied(5) [TRADE: 0 (0%), WATCH: 5 (100%), NO_TRADE: 0 (0%), BLOCKED: 0 (0%)] | notApplied(64) [TRADE: 0 (0%), WATCH: 43 (67.2%), NO_TRADE: 21 (32.8%), BLOCKED: 0 (0%)]
- eurjpy: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(66) [TRADE: 6 (9.1%), WATCH: 39 (59.1%), NO_TRADE: 21 (31.8%), BLOCKED: 0 (0%)]
- eurusd: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(66) [TRADE: 0 (0%), WATCH: 45 (68.2%), NO_TRADE: 21 (31.8%), BLOCKED: 0 (0%)]
- gbpusd: applied(4) [TRADE: 0 (0%), WATCH: 4 (100%), NO_TRADE: 0 (0%), BLOCKED: 0 (0%)] | notApplied(62) [TRADE: 33 (53.2%), WATCH: 8 (12.9%), NO_TRADE: 21 (33.9%), BLOCKED: 0 (0%)]
- gold: applied(5) [TRADE: 0 (0%), WATCH: 5 (100%), NO_TRADE: 0 (0%), BLOCKED: 0 (0%)] | notApplied(61) [TRADE: 0 (0%), WATCH: 40 (65.6%), NO_TRADE: 21 (34.4%), BLOCKED: 0 (0%)]
- ndx: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(63) [TRADE: 0 (0%), WATCH: 10 (15.9%), NO_TRADE: 53 (84.1%), BLOCKED: 0 (0%)]
- silver: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(185) [TRADE: 78 (42.2%), WATCH: 0 (0%), NO_TRADE: 107 (57.8%), BLOCKED: 0 (0%)]
- spx: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(63) [TRADE: 2 (3.2%), WATCH: 12 (19%), NO_TRADE: 49 (77.8%), BLOCKED: 0 (0%)]
- usdjpy: applied(4) [TRADE: 0 (0%), WATCH: 4 (100%), NO_TRADE: 0 (0%), BLOCKED: 0 (0%)] | notApplied(62) [TRADE: 31 (50%), WATCH: 10 (16.1%), NO_TRADE: 21 (33.9%), BLOCKED: 0 (0%)]
- wti: applied(0) [TRADE: 0, WATCH: 0, NO_TRADE: 0, BLOCKED: 0] | notApplied(188) [TRADE: 137 (72.9%), WATCH: 0 (0%), NO_TRADE: 51 (27.1%), BLOCKED: 0 (0%)]

## Top Skipped/Failed Reasons
- missing: 1007
- applied: 19

## Refinement Reasons Breakdown
- btc: applied:1
- dax: missing:64
- dow: missing:63
- eth: missing:64, applied:5
- eurjpy: missing:66
- eurusd: missing:66
- gbpusd: missing:62, applied:4
- gold: missing:61, applied:5
- ndx: missing:63
- silver: missing:185
- spx: missing:63
- usdjpy: missing:62, applied:4
- wti: missing:188

## Bounds Mode Breakdown
- btc: ATR1D=1, PCT=0
- dax: ATR1D=0, PCT=0
- dow: ATR1D=0, PCT=0
- eth: ATR1D=5, PCT=0
- eurjpy: ATR1D=0, PCT=0
- eurusd: ATR1D=0, PCT=0
- gbpusd: ATR1D=4, PCT=0
- gold: ATR1D=5, PCT=0
- ndx: ATR1D=0, PCT=0
- silver: ATR1D=0, PCT=0
- spx: ATR1D=0, PCT=0
- usdjpy: ATR1D=4, PCT=0
- wti: ATR1D=0, PCT=0

## Per-Asset Tabelle
| assetId | playbookId | TRADE | WATCH | NO_TRADE | BLOCKED | top 3 reasons | has4H | refinement applied/used | p50 entryDelta | p90 entryDelta | bounds ATR/PCT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| btc | btc-swing-v0.1 | 0% (0) | 100% (1) | 0% (0) | 0% (0) | Regime range / chop (1); btc:g1_regime:RANGE (1) | yes | 1/1 | 0% | 0% | 1/0 |
| dax | dax-swing-v0.1 | 10.9% (7) | 3.1% (2) | 85.9% (55) | 0% (0) | Regime range/chop (trend confirmation missing) (40); spx:WATCH_RANGE_CONSTRUCTIVE (40); Regime TREND (7) | no | 0/0 | n/a | n/a | 0/0 |
| dow | dow-swing-v0.1 | 6.3% (4) | 17.5% (11) | 76.2% (48) | 0% (0) | Regime range/chop (trend confirmation missing) (34); spx:WATCH_RANGE_CONSTRUCTIVE (34); Alignment derived (index fallback LONG) (11) | no | 0/0 | n/a | n/a | 0/0 |
| eth | crypto-swing-v0.1 | 0% (0) | 69.6% (48) | 30.4% (21) | 0% (0) | Regime range / chop (48); crypto:g1_regime:RANGE (48); Regime range/chop (trend confirmation missing) (4) | yes | 5/5 | 0% | 0% | 5/0 |
| eurjpy | eurjpy-swing-v0.1 | 9.1% (6) | 59.1% (39) | 31.8% (21) | 0% (0) | Alignment fx LONG (38); Derived alignment LONG; bias/trend below defaults (25); Alignment derived (LONG) from bias/trend (25) | no | 0/0 | n/a | n/a | 0/0 |
| eurusd | eurusd-swing-v0.1 | 0% (0) | 68.2% (45) | 31.8% (21) | 0% (0) | Derived alignment SHORT; bias/trend below defaults (48); Alignment derived (SHORT) from bias/trend (48); Alignment fx SHORT (44) | no | 0/0 | n/a | n/a | 0/0 |
| gbpusd | gbpusd-swing-v0.1 | 50% (33) | 18.2% (12) | 31.8% (21) | 0% (0) | Default alignment: bias & trend supportive (33); Derived alignment LONG; bias/trend below defaults (15); Alignment derived (LONG) from bias/trend (15) | yes | 4/4 | 0% | 0% | 4/0 |
| gold | gold-swing-v0.2 | 0% (0) | 68.2% (45) | 31.8% (21) | 0% (0) | Bias too weak (<70) (48); base:bias+signalQuality (26); base:bias+trend+signalQuality (18) | yes | 5/5 | 0% | 0% | 5/0 |
| ndx | ndx-swing-v0.1 | 0% (0) | 15.9% (10) | 84.1% (53) | 0% (0) | Regime range/chop (trend confirmation missing) (39); spx:WATCH_RANGE_CONSTRUCTIVE (39); Alignment derived (index fallback SHORT) (10) | no | 0/0 | n/a | n/a | 0/0 |
| silver | metals-swing-v0.1 | 42.2% (78) | 0% (0) | 57.8% (107) | 0% (0) | silver id (90); Default alignment: bias & trend supportive (78); Alignment derived (SHORT) from bias/trend (62) | no | 0/0 | n/a | n/a | 0/0 |
| spx | spx-swing-v0.1 | 3.2% (2) | 19% (12) | 77.8% (49) | 0% (0) | Regime range/chop (trend confirmation missing) (35); spx:WATCH_RANGE_CONSTRUCTIVE (35); Alignment derived (index fallback LONG) (12) | no | 0/0 | n/a | n/a | 0/0 |
| usdjpy | usdjpy-swing-v0.1 | 47% (31) | 21.2% (14) | 31.8% (21) | 0% (0) | Default alignment: bias & trend supportive (31); Derived alignment LONG; bias/trend below defaults (17); Alignment derived (LONG) from bias/trend (17) | yes | 4/4 | 0% | 0% | 4/0 |
| wti | energy-swing-v0.1 | 72.9% (137) | 0% (0) | 27.1% (51) | 0% (0) | Default alignment: bias & trend supportive (137); wti id (31); Alignment derived (LONG) from bias/trend (30) | no | 0/0 | n/a | n/a | 0/0 |
