# Deployment & Storage Audit (v1) — TradingAI

## A) Evidenz: Deployment-Modell
- **Next.js Config**: `next.config.ts` leer (default). `next.config.js` empty. Kein Custom Server/Docker. → spricht für Vercel/Serverless-Default.
- **Dependencies**: `@neondatabase/serverless`, `drizzle-orm/postgres-js`, `postgres` (single client `max:1`) in `src/server/db/db.ts` → typischer Vercel Serverless + Neon setup (no persistent host).
- **Start script**: `next start` (package.json) vorhanden, aber kein Dockerfile/PM2; kein Hinweis auf selbstverwaltete VM.
- **Kein vercel.json / infra** im Repo → Standard Vercel behavior (ephemeral FS per request/build).
- **Admin Pages Artefakt-First**: z. B. `src/app/[locale]/admin/(panel)/outcomes/diagnostics/page.tsx` liest JSON via `fs` aus `artifacts/phase1/…` → in Serverless wäre FS nicht persistent.

## B) Risiko: artifacts/phase1 in Production
- Vercel Serverless/Edge hat **kein persistentes lokales FS** zwischen Deploys/Requests. Artefakte, die lokal geschrieben werden, verschwinden nach dem Request; nur Build-Time Assets landen im immutable Bundle.
- Phase-1 Admin-Seiten lesen aktuell **lokale Artefakte** (`artifacts/phase1/*`). Diese liegen im Git-Repo, nicht aus einer Cloud-Storage-Quelle. Im Prod-Serverless-Kontext werden sie nur als Build-Assets verfügbar, wenn zur Build-Zeit eingecheckt/mitgepackt.
- GitHub Actions gegen eine deployte URL können keine Artefakte “auf die Runtime-FS” schreiben. → Aktuelle Phase-1 Automationen müssten entweder ins Repo committen oder extern speichern, sonst bleiben Prod-UI-Daten stale.

## C) Empfehlung für Phase-1 Automations (gegen deployte URL)
- **Option C (empfohlen, minimal-invasiv, konsistent mit Phase0):** Artefakte per GitHub Action erzeugen und als GitHub Artifact + optional Commit ins Repo (wie `phase0-monitor` weekly report). Prod-UI liest die committed/bundled Artefakte (oder fetches latest from CDN/raw).
  - Vorteile: keine neue Infra, kein Storage-Setup, deterministische Versionierung.
  - Nachteile: Deploy/commit-Lag; Repo wächst (Mitigation: keep only latest + few snapshots or use GH Artifacts CDN).
- **Option B (Cloud Storage)**: Schreiben nach S3/Vercel Blob/R2; Admin liest via HTTPS. Höherer Aufwand (auth, SDK, URL config), aber kein Repo-Bloat, “latest” easy.
- **Option A (lokales FS)** ist in Vercel-Prod **nicht tragfähig** (ephemeral). Nur sinnvoll für lokale/dev Runs.
→ Kurzfristig: Option C. Mittelfristig: Option B, wenn Artefaktgröße/Anzahl steigt.

## D) Nächste Schritte (ohne Umsetzung)
1) Pipeline festlegen (GitHub Actions):
   - Daily/Weekly Jobs erzeugen Phase-1 Artefakte (`phase1:join-stats`, `phase1:analyze:swing`, `phase1:performance:swing`).
   - Upload als GitHub Artifacts; optional Commit der “latest” Artefakte in repo (ähnlich phase0-monitor).
   - Deploy neu triggern, damit Admin-UI die neuen Dateien enthält, **oder** Admin-UI so anpassen, dass sie “latest artifact” via GitHub Artifact/Raw URL laden.
2) Admin-UI klären:
   - Kurzfristig: liest weiterhin aus eingecheckten Artefakten (Option C → commit).
   - Langfristig: Storage-Agnostic Loader mit HTTP fetch fallback (Option B).
3) Dokumentation:
   - In phase1-Linking/ops-Doku festhalten, dass Prod-FS nicht persistent ist und Artefakt-Quellen (Repo vs External) klar konfiguriert werden müssen.
