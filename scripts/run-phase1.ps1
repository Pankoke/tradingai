# --- CONFIG ---
$RepoPath = "C:\tradingai"   # dein lokales Repo
$Days = 180
$Limit = 1500

# --- ENV (falls nicht global gesetzt) ---
$env:BASE_URL = "https://tradingai-alpha.vercel.app/"
$env:CRON_SECRET = "Super"
$env:DATABASE_URL = "postgresql://neondb_owner:npg_jHNeSBx96DnX@ep-patient-bread-agloa67k-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
$env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_094ODPQLEEa4NCKq_d2Js2O3AWle8B5hlbYarpO2fqwlbW6"

# --- START ---
Write-Host "=== Phase1 Artifact Run START $(Get-Date) ==="

Set-Location $RepoPath

# Optional: Repo aktualisieren
git pull origin main

# Dependencies sicherstellen
npm ci

# 1) Outcomes Backfill
$cleanBase = $env:BASE_URL.TrimEnd("/")
$backfillUrl = "$cleanBase/api/cron/outcomes/backfill?daysBack=$Days&limitSetups=$Limit"

Write-Host "Calling backfill: $backfillUrl"
Invoke-RestMethod `
  -Method POST `
  -Uri $backfillUrl `
  -Headers @{ Authorization = "Bearer $($env:CRON_SECRET)" }

# 2) Join Stats
npm run phase1:join-stats -- --days=$Days

# 3) Swing Outcome Analysis
npm run phase1:analyze:swing -- --days=$Days

# 4) Upload to Vercel Blob
npx ts-node scripts/tsconfig.scripts.json scripts/phase1/upload-phase1-artifacts-to-blob.ts

Write-Host "=== Phase1 Artifact Run DONE $(Get-Date) ==="
