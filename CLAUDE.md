# whistlerbrew-demos — CLAUDE.md

Next.js on **Cloudflare Pages** (`wrangler.toml`, next-on-pages). `git push origin main` auto-deploys in ~30s-3min. Cache-bust with `?bust=NNNNN` / `?v=NNNNN` when verifying. Vercel is not involved anywhere in this repo.

## Sitemap (keep current)
`src/app/projects/page.tsx` → `PROJECTS` array is the single source of truth. Everything shipped is listed on `/projects`; no hidden pages.

## Analytics: Cloudflare Web Analytics is auto-injected at the edge
- **Do NOT** paste `<script data-cf-beacon>` tags into any HTML; it double-counts. `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` stays empty.
- Report: `node scripts/cf-report.mjs [days]` (token `secrets/api-keys.json` → `.cloudflare.analytics_token`).

## Pushup Challenge (LIVE, real participants with logged data)
Never wipe, clear, or destructively modify the Google Sheet. Rules: `.claude/rules/pushup-live-data.md`; context: `pushup/docs/current-status.md`, `pushup/docs/decisions.md` (read both first).
- Source `pushup/pushup-challenge.html` → copy to `public/pushup/index.html` before every commit.
- Apps Script source `pushup/google-apps-script.js`. The clasp project lives at `pushup/apps-script/` (gitignored; the old `/tmp/pushup-apps-script/` copy is gone). If `pushup/apps-script/.clasp.json` is missing, `clasp clone <scriptId>` there first (`clasp list` shows the id). `cp pushup/google-apps-script.js pushup/apps-script/Code.gs && cd pushup/apps-script && clasp push && clasp deploy -i AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg`.
- Verify after deploy in Chrome: `document.body.innerHTML.includes('<unique string from new code>')` with a fresh bust param.

## BC Wildfire Tracker (`public/wildfire/`)
Read `docs/project-log/current-status.md` first (architecture, N8N workflow IDs, data sources, gaps) and `decisions.md`.
- N8N instance https://n8n.srv927040.hstgr.cloud; key `carnivore-weekly/secrets/api-keys.json` → `.n8n.api_key`. GitHub PAT for N8N writes: `secrets/api-keys.json` → `.github.pat` (`n8n-wildfire-writer`, contents R/W on this repo only). `n8n-workflows/` is gitignored because the JSON embeds the PAT.
- Updating workflows through the REST API: `PUT` only `{ name, nodes, connections, settings, staticData }` (anything else 400s), then `POST .../activate`. Use Python urllib, not curl+jq: jsCode newlines confuse jq.
- Session start: check N8N executions (`GET /api/v1/executions?workflowId={id}&limit=3`) and `curl -sL https://whistlerbrew.com/wildfire/data/fires.json | python3 -m json.tool | head -20`.
- Manual data: `canada.json` (CIFFC, no public API) and `world.json`. Danger ratings need the BCWS sitrep PDF path in Workflow B.

## Also deployed from here
- `/firesmart` (FireSmartTV repo copies `display.html` → `public/firesmart/index.html`) and `/simtable` (SimTable builds into `public/simtable/`). Their own CLAUDE.md files hold the deploy steps.
- `/projects/firebox` (Radio Project): `src/app/projects/firebox/`, edge API `src/app/api/firebox/route.ts`, KV `FIREBOX_TRANSCRIPTS`.
- **The Fire Challenge** is a separate repo (`/Users/mbrew/Developer/fire-challenge/`, own CLAUDE.md) on the same Hostinger VPS. If the VPS feels slow, `docker stats` both containers.
