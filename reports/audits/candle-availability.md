# Candle Availability Audit

- Source: DB candles table (read-only)
- GeneratedAt: 2026-02-08T16:50:27.510Z
- Assets (matched): dax(^GDAXI), spx(^GSPC), ndx(^NDX), dow(^DJI), eurusd(EURUSD=X), gbpusd(GBPUSD=X), usdjpy(USDJPY=X), eurjpy(EURJPY=X), gold(GC=F), silver(SI=F), wti(CL=F), eth(ETH-USD)
- Timeframes: 1H, 4H, 1D

| assetId | symbol | timeframe | count30d | count60d | latestTimestamp | age | latestSource | sources | status |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| dax | ^GDAXI | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| dax | ^GDAXI | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| dax | ^GDAXI | 1D | 20 | 71 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| dow | ^DJI | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| dow | ^DJI | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| dow | ^DJI | 1D | 19 | 86 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| eth | ETH-USD | 1H | 720 | 1440 | 2026-02-08T16:00:00.000Z | 50m | twelvedata | binance,twelvedata | available |
| eth | ETH-USD | 4H | 210 | 390 | 2026-02-08T16:00:00.000Z | 50m | derived | derived,twelvedata | available |
| eth | ETH-USD | 1D | 30 | 174 | 2026-02-08T00:00:00.000Z | 16.8h | yahoo | yahoo | available |
| eurjpy | EURJPY=X | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| eurjpy | EURJPY=X | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| eurjpy | EURJPY=X | 1D | 23 | 130 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| eurusd | EURUSD=X | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| eurusd | EURUSD=X | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| eurusd | EURUSD=X | 1D | 23 | 125 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| gbpusd | GBPUSD=X | 1H | 500 | 500 | 2026-02-07T17:00:00.000Z | 23.8h | twelvedata | twelvedata | available |
| gbpusd | GBPUSD=X | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| gbpusd | GBPUSD=X | 1D | 26 | 133 | 2026-02-08T00:00:00.000Z | 16.8h | yahoo | yahoo | available |
| gold | GC=F | 1H | 720 | 1243 | 2026-02-08T16:00:00.000Z | 50m | twelvedata | twelvedata | available |
| gold | GC=F | 4H | 227 | 435 | 2026-02-08T16:00:00.000Z | 50m | derived | derived,twelvedata | available |
| gold | GC=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| ndx | ^NDX | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| ndx | ^NDX | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| ndx | ^NDX | 1D | 19 | 85 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| silver | SI=F | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| silver | SI=F | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| silver | SI=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| spx | ^GSPC | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| spx | ^GSPC | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| spx | ^GSPC | 1D | 19 | 85 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| usdjpy | USDJPY=X | 1H | 500 | 500 | 2026-02-07T17:00:00.000Z | 23.8h | twelvedata | twelvedata | available |
| usdjpy | USDJPY=X | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| usdjpy | USDJPY=X | 1D | 24 | 129 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |
| wti | CL=F | 1H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| wti | CL=F | 4H | 0 | 0 | n/a | n/a | n/a | n/a | missing |
| wti | CL=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z | 2.7d | yahoo | yahoo | available |

## Provider/Source Summary (last 60d)

| source | assetId | symbol | timeframe | count30d | count60d | latestTimestamp |
| --- | --- | --- | --- | ---: | ---: | --- |
| binance | eth | ETH-USD | 1H | 0 | 174 | 2025-12-17T22:00:00.000Z |
| derived | eth | ETH-USD | 4H | 167 | 167 | 2026-02-08T16:00:00.000Z |
| derived | gold | GC=F | 4H | 180 | 191 | 2026-02-08T16:00:00.000Z |
| twelvedata | eth | ETH-USD | 1H | 720 | 1266 | 2026-02-08T16:00:00.000Z |
| twelvedata | eth | ETH-USD | 4H | 43 | 223 | 2026-01-15T11:00:00.000Z |
| twelvedata | gbpusd | GBPUSD=X | 1H | 500 | 500 | 2026-02-07T17:00:00.000Z |
| twelvedata | gold | GC=F | 1H | 720 | 1243 | 2026-02-08T16:00:00.000Z |
| twelvedata | gold | GC=F | 4H | 47 | 244 | 2026-01-15T14:00:00.000Z |
| twelvedata | usdjpy | USDJPY=X | 1H | 500 | 500 | 2026-02-07T17:00:00.000Z |
| yahoo | dax | ^GDAXI | 1D | 20 | 71 | 2026-02-06T00:00:00.000Z |
| yahoo | dow | ^DJI | 1D | 19 | 86 | 2026-02-06T00:00:00.000Z |
| yahoo | eth | ETH-USD | 1D | 30 | 174 | 2026-02-08T00:00:00.000Z |
| yahoo | eurjpy | EURJPY=X | 1D | 23 | 130 | 2026-02-06T00:00:00.000Z |
| yahoo | eurusd | EURUSD=X | 1D | 23 | 125 | 2026-02-06T00:00:00.000Z |
| yahoo | gbpusd | GBPUSD=X | 1D | 26 | 133 | 2026-02-08T00:00:00.000Z |
| yahoo | gold | GC=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z |
| yahoo | ndx | ^NDX | 1D | 19 | 85 | 2026-02-06T00:00:00.000Z |
| yahoo | silver | SI=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z |
| yahoo | spx | ^GSPC | 1D | 19 | 85 | 2026-02-06T00:00:00.000Z |
| yahoo | usdjpy | USDJPY=X | 1D | 24 | 129 | 2026-02-06T00:00:00.000Z |
| yahoo | wti | CL=F | 1D | 23 | 135 | 2026-02-06T00:00:00.000Z |
