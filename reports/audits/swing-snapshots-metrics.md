# Swing Snapshots Metrics (read-only)

Quelle: perception_snapshots (DB), Zeitraum: letzte 60 Tage (falls vorhanden)
Abfragezeit: 2026-02-07T16:37:18.578Z

## Pro Asset
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

## Zusammenfassung
### Höchster WATCH-Anteil (Top 5)
- eth: WATCH 67.2% (43)
- eurusd: WATCH 65.6% (40)
- gold: WATCH 65.6% (40)
- eurjpy: WATCH 55.7% (34)
- spx: WATCH 20.7% (12)

### Top BLOCKED-Reasons
- n/a
