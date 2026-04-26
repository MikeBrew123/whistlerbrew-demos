# Wildfire Tracker — Current Status
Last updated: 2026-04-25 (Session 3)

## Live URL
https://whistlerbrew.com/wildfire/index.html
(redirects from /wildfire via Next.js next.config.ts)

## Stack
- Static SPA: `public/wildfire/` (index.html + style.css + app.js)
- Data: `public/wildfire/data/` (fires.json, canada.json, world.json, firesmart-news.json)
- Hosting: Cloudflare Pages (auto-deploys on git push to main)
- Pipeline: N8N at https://n8n.srv927040.hstgr.cloud

## N8N Workflows
| ID | Name | Schedule | Status |
|----|------|----------|--------|
| khKKRqqe7yudNG6B | Workflow A — Fast Refresh | Every 15 min | ✅ Active, confirmed working (25 BC fires live) |
| 91nhFP81Tc8XCoqS | Workflow B — Full Refresh | Every 6 hr | ✅ Fixed & redeployed Session 3 |
| Xcp8eSz8FUtIY4qa | Workflow C — News Refresh | Every 6 hr | ✅ Active (GlobalNews feed) |
| ySh1dMIJpOrki6QM | Workflow D — FireSmart News | Every 6 hr | ✅ Active |

**Workflow A does:** BCWS All Fires → BCWS FoN → BC Emergency Alert RSS → Get fires.json → Code (update counts + clear stale FoN lists + reset danger ratings) → PUT to GitHub

**Workflow B adds:** BCWS All Fires (per zone) + CBC BC News RSS → zone_news + fires_of_note_list + zone_road_closures injection → PUT fires.json to GitHub
- Fixed Session 3: SIZE_HA → CURRENT_SIZE, ZONE_MAP now integer IDs, active filter corrected

**Workflow C does:** GlobalNews wildfire RSS + BBC RSS + InciWeb RSS → Collate Articles → Claude haiku → PUT canada.json + world.json to GitHub

**Workflow D does:** FireSmart BC + BC Emergency + CBC BC RSS → Claude haiku zone classifier → PUT firesmart-news.json to GitHub

## ArcGIS Field Names (CONFIRMED — do not change)
- `CURRENT_SIZE` (not SIZE_HA, not FIRE_SIZE_HECTARES)
- `FIRE_OF_NOTE_IND` (not FIRE_OF_NOTE) — values: "Y" or null
- `FIRE_CENTRE` — integer IDs: 2=Coastal, 3=Northwest, 4=Prince George, 5=Kamloops, 6=Southeast, 7=Cariboo
- `FIRE_STATUS` — "Out of Control", "Being Held", "Under Control", "Out"
- `FIRE_TYPE` — always returns "Fire" for all records (useless, not shown in UI)
- `RESPONSE_TYPE_DESC` — "Full Response", "Modified Response", etc.
- ⚠️ Any invalid field in outFields causes silent 0-row response — no error thrown

## Zone Fire List (app.js — Session 3)
Each zone detail view shows individual fires fetched live from BCWS ArcGIS.
- Status badge (colored), fire name/geo, fire number + ha + ignition date
- Cause pill, Response Type pill (blue)
- BCWS Incident link, Google Maps link
- "🚒 Respond to this fire" → opens SPS Briefing at `/projects/sps-briefing?fireNumber=&community=&reportTo=`
- Active fires first (Out of Control → Being Held → Under Control), then Out/Extinguished

## SPS Briefing Integration
- `src/app/projects/sps-briefing/page.tsx` reads URL params (fireNumber, community, reportTo) and pre-fills form
- Requires Suspense wrapper around useSearchParams for Next.js SSR compatibility
- Auth redirect encodes full path+search so fire params survive the password flow

## Auth System (Session 3)
- Key: `wb_auth_exp` in both localStorage and sessionStorage
- Value: Unix timestamp (ms) = login time + 7 days
- Check: `parseInt(stored) > Date.now()`
- Replaces old `whistlerbrew_auth = "true"` string — users need to re-login once after deploy
- 7-day sessions mean signed-in users bypass password when opening SPS Briefing in a new tab
- Logout: removes wb_auth_exp from both storages

## News Tab (zone detail)
Sources merged in order:
1. `zone.zone_news` from fires.json (Workflow B — CBC BC articles)
2. FireSmart news from firesmart-news.json (Workflow D — zone-matched + "all")
3. BC Wildfire Blog posts — async-fetched from `blog.gov.bc.ca/bcwildfire/wp-json/wp/v2/posts?search={zoneName}&per_page=5&_embed=wp:featuredmedia`

## Data Sources
- BCWS GeoJSON: services6.arcgis.com/ubm4tcTYICKBpist (public, no auth)
- BC Emergency Alert RSS: emergencyinfobc.gov.bc.ca/rss/
- GlobalNews wildfire feed: globalnews.ca/tag/wildfire/feed/ (replaced Yahoo CA — rate-limited)
- CBC BC RSS: cbc.ca/cmlink/rss-canada-britishcolumbia (Workflow B)
- BBC World RSS: feeds.bbci.co.uk/news/world/rss.xml (Workflow C)
- InciWeb RSS: inciweb.nwcg.gov/feeds/rss/incidents/ (Workflow C)
- BC Wildfire Blog: blog.gov.bc.ca/bcwildfire/wp-json/wp/v2/ (client-side, zone News tab)

## Known Gaps / Next Steps
1. **News/Roads/Stats tabs** — verify populated after Workflow B next 6-hr run
2. **Danger ratings** — Workflow B Claude API path (sitrep PDF) needs activation when fire season starts
3. **Canada CIFFC stats** — manual update needed for fire counts/ha when season starts
4. **Social media** — Twitter @BCGovFireInfo search link is best free option (API is paid)
5. **fire season start** — May–June: activate danger ratings, update canada.json

## Credentials
- GitHub PAT: `whistlerbrew-demos/secrets/api-keys.json` → `.github.pat`
- N8N API key: `carnivore-weekly/secrets/api-keys.json` → `.n8n.api_key`
- Anthropic API key: `carnivore-weekly/secrets/api-keys.json` → `.anthropic.key`
