# Wildfire Tracker — Current Status
Last updated: 2026-03-06

## Live URL
https://whistlerbrew.com/wildfire/index.html
(redirects from /wildfire via Next.js next.config.ts)

## Stack
- Static SPA: `public/wildfire/` (index.html + style.css + app.js)
- Data: `public/wildfire/data/` (fires.json, canada.json, world.json)
- Hosting: Cloudflare Pages (auto-deploys on git push to main)
- Pipeline: N8N at https://n8n.srv927040.hstgr.cloud

## N8N Workflows
| ID | Name | Schedule | Status |
|----|------|----------|--------|
| khKKRqqe7yudNG6B | Workflow A — Fast Refresh | Every 15 min | ✅ Active, confirmed running |
| 91nhFP81Tc8XCoqS | Workflow B — Full Refresh | Every 6 hr | ✅ Active |

**Workflow A does:** BCWS All Fires → BCWS FoN → BC Emergency Alert RSS → Get fires.json → Code (update counts + clear stale FoN lists + reset danger ratings) → PUT to GitHub

**Workflow B adds:** CBC BC News RSS → zone_news injection + fires_of_note_list live refresh

## Data Sources (live)
- BCWS GeoJSON: services6.arcgis.com/ubm4tcTYICKBpist (public, no auth)
- BC Emergency Alert RSS: emergencyinfobc.gov.bc.ca/rss/
- CBC BC RSS: cbc.ca/cmlink/rss-canada-britishcolumbia

## Data Sources (manual / static)
- canada.json: CIFFC has no public API — currently all zeros (off-season). Update manually when season starts.
- world.json: Updated manually with real 2026 fires (Chile, Australia, Argentina). No automation yet.
- Danger ratings: BCWS spatial polygon dataset — not queryable per fire centre. Shows N/A off-season.

## Known Gaps / Next Steps
1. **Danger ratings** — Workflow B Claude API path (sitrep PDF extraction) when active fires exist
2. **Canada CIFFC stats** — manual update or scraping solution
3. **World fire automation** — InciWeb (US), Copernicus (EU/world)
4. **DriveBC road closures** — API URL uncertain; placeholder in Workflow B design

## Credentials
- GitHub PAT: `whistlerbrew-demos/secrets/api-keys.json` → `.github.pat` (scoped to this repo, Contents R/W)
- N8N API key: `carnivore-weekly/secrets/api-keys.json` → `.n8n.api_key`
- All secrets gitignored via `secrets/*`

## Architecture Notes
- fires.json is the single source of truth for BC data. N8N writes it, app.js reads it.
- canada.json and world.json are manually maintained (no N8N pipeline yet).
- Workflow A auto-clears `fires_of_note_list` when zone FoN count = 0 (prevents stale dummy data).
- Workflow A replaces `zone_evac_notices` each run (not appends).
- `danger_rating` set to N/A when zone has 0 active fires.
