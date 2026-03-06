# Wildfire Tracker — Decisions Log

## 2026-03-06

### URL: /wildfire (not /wildfirenews)
Build plan specified /wildfire. User originally said /wildfirenews but /wildfire was used per the plan.

### N8N sequential chain pattern (not parallel fan-out)
Parallel fan-out (trigger → 4 HTTP nodes → Code) fires the Code node N times in N8N v1. Sequential chain is correct. Deleted parallel workflow (oNsdHvcweUkRy0Jp), rebuilt as sequential (khKKRqqe7yudNG6B).

### Danger ratings: N/A off-season
BCWS fire danger rating is a spatial polygon dataset — not queryable as a simple per-fire-centre value. Decision: show N/A when zone has 0 active fires. Hide the pill in UI entirely. When fire season starts, danger ratings will require either manual input or sitrep PDF extraction via Claude API (Workflow B path).

### fires.json as single source of truth
N8N writes to fires.json via GitHub REST API (GET → decode → modify → PUT). This means the CDN always serves the latest data without needing a backend. Cloudflare Pages CDN cache is acceptable latency for wildfire tracking.

### canada.json and world.json: manual for now
CIFFC has no public API. World fire data has no single reliable live source. Both files updated manually. Automation (scraping/API) is a future task.

### GitHub PAT: fine-grained, single-repo scope
PAT named `n8n-wildfire-writer`, scoped to MikeBrew123/whistlerbrew-demos, Contents: Read/Write only. Stored in secrets/api-keys.json (gitignored). n8n-workflows/ directory also gitignored (workflow JSON files embed the PAT).
