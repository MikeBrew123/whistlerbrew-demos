# whistlerbrew-demos — CLAUDE.md

## ⚠️ LIVE APP WITH REAL USER DATA
**whistlerbrew.com/pushup** is live and has real participants registered with logged pushups.
- Never wipe, clear, or destructively modify the Google Sheet
- Always verify changes carefully before deploying
- When in doubt, read `pushup/docs/decisions.md` → Data Protection Rules

---

## Active Project: Pushup Challenge

### Key Docs (read these first)
| File | Purpose |
|------|---------|
| `pushup/docs/current-status.md` | Full architecture, file locations, deploy commands, API endpoints, key functions |
| `pushup/docs/decisions.md` | Why things are built the way they are + lessons learned (do not repeat these mistakes) |

### Quick Reference
- **Live URL:** https://whistlerbrew.com/pushup/index.html
- **Frontend source:** `pushup/pushup-challenge.html`
- **Deployed copy:** `public/pushup/index.html` ← always sync before committing
- **Backend:** Google Apps Script (clasp project at `/tmp/pushup-apps-script/`)
- **Apps Script source:** `pushup/google-apps-script.js` ← always sync to `/tmp/pushup-apps-script/Code.gs` before clasp push

### Deploy Workflow
**Frontend:**
```bash
cp pushup/pushup-challenge.html public/pushup/index.html
git add pushup/pushup-challenge.html public/pushup/index.html
git commit -m "message"
git push
# Vercel auto-deploys in 2-3 min — verify with ?bust=NNNNN cache param
```

**Apps Script:**
```bash
cp pushup/google-apps-script.js /tmp/pushup-apps-script/Code.gs
cd /tmp/pushup-apps-script
clasp push
clasp deploy -i AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg
```

### Verification (always do this after deploy)
```javascript
// In Chrome MCP — navigate to live URL with fresh bust param
document.body.innerHTML.includes('unique-string-from-new-code')
```
Vercel CDN caches aggressively. Use incrementing `?bust=NNNNN` params until `includes()` returns true.

---

## Session Start Checklist (Pushup)
1. Read `pushup/docs/current-status.md` for current state
2. Read `pushup/docs/decisions.md` for rules and lessons learned
3. Remember: real users are in the system — protect their data

---

## Active Project: BC Wildfire Tracker

### Key Docs (read these first)
| File | Purpose |
|------|---------|
| `docs/project-log/current-status.md` | Architecture, N8N workflow IDs, data sources, known gaps |
| `docs/project-log/decisions.md` | Why things are built the way they are |

### Quick Reference
- **Live URL:** https://whistlerbrew.com/wildfire/index.html
- **Static source:** `public/wildfire/` (index.html, style.css, app.js)
- **Data files:** `public/wildfire/data/` (fires.json, canada.json, world.json)
- **Hosting:** Cloudflare Pages — auto-deploys on `git push origin main`

### N8N Workflows (all active)
| ID | Schedule | What it does |
|----|----------|-------------|
| `khKKRqqe7yudNG6B` | Every 15 min | BCWS fire counts + evac notices → fires.json → GitHub |
| `91nhFP81Tc8XCoqS` | Every 6 hr | Above + CBC BC news + fires_of_note_list refresh |
| `Xcp8eSz8FUtIY4qa` | Every 6 hr | CBC + BBC + InciWeb RSS → Claude haiku → world.json + canada.json news |
| `ySh1dMIJpOrki6QM` | Every 6 hr | FireSmart BC + BC Emergency + CBC BC RSS → Claude haiku zone classifier → firesmart-news.json |

**N8N instance:** https://n8n.srv927040.hstgr.cloud
**API key:** `carnivore-weekly/secrets/api-keys.json` → `.n8n.api_key`

### GitHub PAT (for N8N → GitHub writes)
Stored in `whistlerbrew-demos/secrets/api-keys.json` → `.github.pat`
- Name: `n8n-wildfire-writer`, scoped to this repo, Contents R/W only
- **n8n-workflows/ is gitignored** — workflow JSON files embed the PAT

### How fires.json gets updated
```
N8N Schedule → BCWS GeoJSON API (public) → Code node → GitHub REST API PUT
GET https://api.github.com/repos/MikeBrew123/whistlerbrew-demos/contents/public/wildfire/data/fires.json
PUT same URL with { message, content (base64), sha }
```

### Updating N8N workflows via API
```python
# GET current workflow
GET https://n8n.srv927040.hstgr.cloud/api/v1/workflows/{id}

# PUT update — only send these fields (others cause 400)
PUT { name, nodes, connections, settings, staticData }

# Activate
POST https://n8n.srv927040.hstgr.cloud/api/v1/workflows/{id}/activate
```
Use Python urllib (not curl+jq) — jsCode contains newlines that confuse jq.

### Data Sources — what's live vs manual
| Data | Source | Automated? |
|------|--------|-----------|
| BC fire counts | BCWS ArcGIS GeoJSON | ✅ Workflow A every 15 min |
| BC evac notices | emergencyinfobc.gov.bc.ca/rss/ | ✅ Workflow A |
| BC zone news | CBC BC RSS (wildfire-filtered) | ✅ Workflow B every 6 hr |
| Danger ratings | N/A — BCWS spatial polygon, not per-centre | ❌ Shows N/A off-season |
| Canada CIFFC stats | No public API | ❌ Manual — canada.json |
| World fires | No single live API | ❌ Manual — world.json |

### Off-season behaviour (current state, March 2026)
- All zone cards show "No active fires", no danger pill
- fires.json: all counts 0, fires_of_note_list empty (Workflow A clears when FoN=0)
- canada.json: all zeros, PL1 — update manually when season starts
- world.json: real 2026 fires (Chile, Australia, Argentina) — all contained

### What to do when fire season starts (May–June)
1. Danger ratings: Workflow B has Claude API path scaffolded — needs activation + sitrep PDF URL
2. canada.json: manual update or add CIFFC scraping workflow
3. world.json: manual update or add InciWeb/Copernicus workflow
4. fires_of_note_list will auto-populate from live BCWS FoN GeoJSON via Workflow B

### Deploy / Cache
```bash
git push origin main   # triggers Cloudflare Pages auto-deploy (~30s)
# CDN cache bust if JS not updating: add ?v=NNNNN to script tag in index.html
```

### Session Start Checklist (Wildfire)
1. Read `docs/project-log/current-status.md`
2. Check N8N execution history: GET `/api/v1/executions?workflowId={id}&limit=3`
3. Check live fires.json: `curl -sL https://whistlerbrew.com/wildfire/data/fires.json | python3 -m json.tool | head -20`
