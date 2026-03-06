# Wildfire Tracker — Current Status
Last updated: 2026-03-06 (Session 2)

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
| Xcp8eSz8FUtIY4qa | Workflow C — News Refresh | Every 6 hr | ✅ Active, deployed Session 2 |

**Workflow A does:** BCWS All Fires → BCWS FoN → BC Emergency Alert RSS → Get fires.json → Code (update counts + clear stale FoN lists + reset danger ratings) → PUT to GitHub

**Workflow B adds:** CBC BC News RSS → zone_news injection + fires_of_note_list live refresh

**Workflow C does:** CBC RSS + BBC RSS + InciWeb RSS → Collate Articles → Claude haiku API → Build Updated Files (2 items) → PUT canada.json + world.json to GitHub
- Updates `canada.json.news` array with Canadian wildfire news
- Updates `world.json.fires` array with international wildfire events (extracted by Claude)
- Claude model: claude-haiku-4-5 | API key: carnivore-weekly/secrets/api-keys.json → `.anthropic.key`

## Data Sources (live)
- BCWS GeoJSON: services6.arcgis.com/ubm4tcTYICKBpist (public, no auth)
- BC Emergency Alert RSS: emergencyinfobc.gov.bc.ca/rss/
- CBC BC RSS: cbc.ca/cmlink/rss-canada-britishcolumbia (Workflow B)
- CBC National RSS: cbc.ca/cmlink/rss-canada (Workflow C)
- BBC World RSS: feeds.bbci.co.uk/news/world/rss.xml (Workflow C)
- InciWeb RSS: inciweb.nwcg.gov/feeds/rss/incidents/ (Workflow C — US wildfire incidents)

## Data Sources (manual / partially automated)
- canada.json CIFFC stats: still manual zeros (off-season). `news` field now auto-updated by Workflow C.
- world.json: `fires` array now auto-updated by Workflow C via Claude haiku extraction.
- Danger ratings: BCWS spatial polygon dataset — not queryable per fire centre. Shows N/A off-season.

## Known Gaps / Next Steps
1. **Danger ratings** — Workflow B Claude API path (sitrep PDF extraction) when active fires exist
2. **Canada CIFFC stats** — manual update still needed for fire counts/ha (no public API)
3. **World fire automation** — Workflow C handles news-driven updates; Copernicus/EU still not wired
4. **DriveBC road closures** — API URL uncertain; placeholder in Workflow B design
5. **Workflow C first run** — scheduled every 6hr, first run will validate Claude extraction

## Credentials
- GitHub PAT: `whistlerbrew-demos/secrets/api-keys.json` → `.github.pat` (scoped to this repo, Contents R/W)
- N8N API key: `carnivore-weekly/secrets/api-keys.json` → `.n8n.api_key`
- Anthropic API key: `carnivore-weekly/secrets/api-keys.json` → `.anthropic.key`
- All secrets gitignored via `secrets/*`

## Architecture Notes
- fires.json is the single source of truth for BC data. N8N writes it, app.js reads it.
- canada.json: CIFFC stats are manual; `news` field is now live via Workflow C.
- world.json: `fires` array now live via Workflow C (Claude haiku extracts from RSS).
- Workflow A auto-clears `fires_of_note_list` when zone FoN count = 0 (prevents stale dummy data).
- Workflow A replaces `zone_evac_notices` each run (not appends).
- `danger_rating` set to N/A when zone has 0 active fires.
- Workflow C uses single PUT-to-GitHub node processing 2 items (canada + world) — cleaner than 2 nodes.
- app.js renderWorldFireCard: shows `news` array as source links, null-safe hectares, Argentina flag added.

## app.js Changes (Session 2)
- renderWorldFireCard: null-safe hectares (`fw.hectares ? ... : 'Size unknown'`)
- renderWorldFireCard: Argentina 🇦🇷 flag added to flags map
- renderWorldFireCard: renders `fw.news[]` as source links (`.world-fire-sources` CSS class)
- style.css: added `.world-fire-sources` rule (0.72rem, var(--text-muted), link hover states)
