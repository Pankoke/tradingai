# Admin Inventory (Phase-0 baseline)

Quelle: Routen unter `src/app/[locale]/admin/(panel)` und zugehörige Services (Stand 2026-01-21).

| Route | Page Component | Data Sources / Services | Kernmodelle | Purpose | Hinweise/Pain Points |
| --- | --- | --- | --- | --- | --- |
| /admin/(panel) | `src/app/[locale]/admin/(panel)/page.tsx` | – | – | Admin Landing | Navigation only |
| /admin/(panel)/monitoring/reports | `monitoring/reports/page.tsx` | Filesystem `reports/weekly/*.md` | Weekly Report Markdown | Liste Weekly Health Reports | FS-basiert; kein API-Drilldown |
| /admin/(panel)/monitoring/reports/[date] | `monitoring/reports/[date]/page.tsx` | Filesystem `reports/weekly/<date>.md` | Weekly Report Markdown | Render einzelner Report | Kein API; nur Markdown Render |
| /admin/(panel)/monitoring/reports/latest | `monitoring/reports/latest/page.tsx` | Redirect auf neuesten Report | – | Convenience | – |
| /admin/(panel)/outcomes | `outcomes/page.tsx` | `loadOutcomes` (Outcome-Service, Datei nicht geöffnet) | outcomes, snapshots | Outcomes Listing | Bedarf Drilldown prüfen |
| /admin/(panel)/outcomes/engine-health | `outcomes/engine-health/page.tsx` | `loadEngineHealth` (`src/src/server/admin/outcomeService`) | outcomes, evaluation window | Forward Cohort / Engine Health | Filter: days, assetId, playbookId, engineVersion, includeUnknown/nullEvalTf |
| /admin/(panel)/playbooks/thresholds | `playbooks/thresholds/page.tsx` | `loadGoldThresholdRecommendations`, `loadThresholdRelaxationSimulation` | thresholds, simulation grids | Playbook Threshold Simulation/Recommendations | Gold-fokussiert; andere Assets fehlen |
| /admin/(panel)/playbooks/calibration | `playbooks/calibration/page.tsx` | `loadCalibrationStats` (`src/src/server/admin/calibrationService`) | playbook calibration stats | Calibration Overview | Playbook-Optionen hart codiert (gold/index/crypto/fx/generic) |
| /admin/(panel)/ops | `ops/page.tsx` | Ops service (nicht geöffnet) | – | Ops dashboard | Details offen |
| /admin/(panel)/audit | `audit/page.tsx` | Audit service (nicht geöffnet) | – | Audit view | Details offen |
| /admin/(panel)/assets + /assets/[id] + /assets/new | `assets/*.tsx` | Asset CRUD services (nicht geöffnet) | assets table | Asset Management | Standard CRUD |
| /admin/(panel)/events (+/new, +/[id]) | `events/*.tsx` | Event service (nicht geöffnet) | events table | Event Management | – |
| /admin/(panel)/marketdata | `marketdata/page.tsx` | Marketdata service (nicht geöffnet) | provider feeds | Marketdata view | – |
| /admin/(panel)/snapshots (+/[id]) | `snapshots/*.tsx` | Snapshot service (nicht geöffnet) | perceptionSnapshots | Snapshot list/detail | – |
| /admin/(panel)/system (+/coverage) | `system/*.tsx` | System service (nicht geöffnet) | system health | System overview | Coverage-Seite vorhanden |
| /admin/(auth)/login | `login/page.tsx` | Clerk/Next-Auth UI | – | Admin Login | – |

Note: Weitere Endpunkte (API) existieren unter `src/app/api/admin/...` – hier nicht exhaustiv gelistet.
