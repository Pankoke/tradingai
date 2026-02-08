# Swing Snapshots Metrics (read-only)

Quelle: perception_snapshots (DB), Zeitraum: letzte 60 Tage (falls vorhanden)
Abfragezeit: 2026-02-07T18:52:51.433Z

## Pro Asset
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

## Zusammenfassung
### Höchster WATCH-Anteil (Top 5)
- btc: WATCH 100% (1)
- eth: WATCH 69.6% (48)
- eurusd: WATCH 68.2% (45)
- gold: WATCH 68.2% (45)
- eurjpy: WATCH 59.1% (39)

### Top BLOCKED-Reasons
- n/a
