# Generic Playbook Trace (WTI/Silver, Swing) — v1

Quelle: ad-hoc DB Query (ts-node, 60d Fenster, labels eod/us_open/morning/(null); snapshots >= 2025-12-23). Pfad siehe `scripts/tsconfig.scripts.json` mit inline query.

Gefundene Beispiele (playbookId/setupPlaybookId == generic-swing-v0.1, decision BLOCKED/TRADE):

1. WTI, snapshot 19090d1b… (2025-12-29T18:37:35Z), label eod, tf 1W  
   - profile=POSITION, providerSymbolUsed=CL=F  
   - setupDecision=BLOCKED, noTradeReason="No default alignment", decisionReasons=["No default alignment","non-swing profile"]

2. WTI, snapshot 19090d1b… (2025-12-29T18:37:35Z), label eod, tf 1D  
   - profile=SWING, providerSymbolUsed=CL=F  
   - setupDecision=BLOCKED, decisionReasons=["No default alignment","fallback generic"]

3. Silver, snapshot 19090d1b… (2025-12-29T18:37:35Z), label eod, tf 1D  
   - profile=SWING, providerSymbolUsed=SI=F  
   - setupDecision=BLOCKED, decisionReasons=["No default alignment","fallback generic"]

4. Silver, snapshot 19090d1b… (2025-12-29T18:37:35Z), label eod, tf 1W  
   - profile=POSITION, providerSymbolUsed=SI=F  
   - setupDecision=BLOCKED, decisionReasons=["No default alignment","non-swing profile"]

5. Silver, snapshot f77e3c11… (2026-01-18T12:51:06Z), label us_open, tf 1D  
   - profile=SWING, providerSymbolUsed=SI=F  
   - setupDecision=TRADE, grade=B, gradeRationale=["Default alignment: bias & trend supportive"]

6. WTI, snapshot f77e3c11… (2026-01-18T12:51:06Z), label us_open, tf 1D  
   - profile=SWING, providerSymbolUsed=CL=F  
   - setupDecision=TRADE, grade=B, gradeRationale=["Default alignment: bias & trend supportive"]

Weitere ähnliche Funde: snapshot ecfb5deb… (2026-01-13) und 813dcb52… (2026-01-14) für WTI/Silver TRADE B mit generic playbook.

Hinweise aus den Funden:
- assetId in setups: wti / silver (korrekt), symbol: CL=F / SI=F.
- profile SWING/position vorhanden, dennoch decisionReasons enthalten "fallback generic" oder "non-swing profile".
- playbookId/setupPlaybookId persisted als generic-swing-v0.1 → Resolver/Build hat Asset-Klassen (energy/metals) nicht gezogen, obwohl Symbols matchen sollten.
