# Phase-1 Artifact Storage (Vercel Blob)

- **Warum**: Prod (Vercel Serverless) hat kein persistentes lokales FS. Artefakte mÃ¼ssen extern abgelegt werden.
- **Storage**: Vercel Blob, private, Keys:
  - `phase1/swing-outcome-analysis/latest-v2.json` (Fallback: latest-v1)
  - `phase1/join-stats/latest-v1.json`
- **Loader**: `src/lib/artifacts/storage.ts`
  - versucht Blob (mit `BLOB_READ_WRITE_TOKEN`) zuerst, fÃ¤llt auf `artifacts/phase1` im Repo zurÃ¼ck (Dev/Local).
- **Upload**: `scripts/phase1/upload-phase1-artifacts-to-blob.ts`
  - liest lokale `artifacts/phase1/*latest*.json`, lÃ¤dt sie nach Blob
  - env: `BLOB_READ_WRITE_TOKEN`
- **CI**: `.github/workflows/phase1-blob-artifacts.yml`
  - Daily (06:30 UTC, days=180) + Weekly (Mo 07:00 UTC, days=365)
  - Steps: outcomes backfill (curl), `phase1:join-stats`, `phase1:analyze:swing`, Upload to Blob
  - Secrets: `BASE_URL`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`
- **Admin Pages**: Outcomes/Playbooks/Diagnostics nutzen Storage-Loader (Blob oder FS) und zeigen Artefakt-Quelle.
- **Lokale Nutzung**: Ohne Blob-Token werden Artefakte aus `artifacts/phase1` gelesen.
