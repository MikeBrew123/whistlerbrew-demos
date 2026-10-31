# Wildfire Tracker — Decisions Log

## 2026-03-06 (Session 2)

### Workflow C: RSS → Claude haiku → world.json + canada.json
Built a third N8N workflow (ID: Xcp8eSz8FUtIY4qa, every 6hr) that replaces manual world/canada news updates. Sequential chain: CBC National RSS + BBC World RSS + InciWeb RSS → Code (parse RSS, decode GitHub files, build Claude payload) → Claude haiku API → Code (parse response, build 2 updated JSON files) → single HTTP PUT node (processes both canada.json + world.json items). Reuters feed was dead; rss.app was dead; InciWeb is wildfire-specific and active. Anthropic key at `carnivore-weekly/secrets/api-keys.json` → `.anthropic.key`. Model: claude-haiku-4-5.

### Single PUT node handles two files
Rather than two separate GitHub PUT nodes, node 9 "Build Updated Files" returns TWO items (one per file). A single "PUT to GitHub" HTTP node processes both — cleaner, avoids node reference complexity. URL uses expression: `{{ 'https://.../' + $json.file }}`.

### World fire card updates (app.js Session 2)
renderWorldFireCard now null-safe for hectares, has Argentina flag, and renders `fw.news[]` as source attribution links. style.css updated with `.world-fire-sources` class.

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

## 2026-09-28
- Added /shopping (Shopping in Whistler). Static page + data.json pushed daily by the Mac mini (HomeBrain shopper/whistler-deals.py) via the GitHub contents API. Link is /shopping/index.html because /shopping/ 404s on Pages.

## 2026-10-10
- /sayulita is public: town WhatsApp groups only, never friend chats, no personal contact; hide list via Hermes (Brew).

## 2026-10-30
- Added /bridge (The Rainbow Bridge, AI pet medium). Static page `public/bridge/index.html` + edge route `src/app/api/bridge/route.ts` on claude-sonnet-5-5 with `thinking: {type: "between_tools"}` (default adaptive thinking ate the whole max_tokens and returned empty replies). Free for now; reading JSON carries `tier: "free"` and the page has a hidden `.deeper` slot for a paid reading via Stripe later. Footer disclaimer ("for comfort and reflection, for entertainment") plus ASPCA pet-loss line and 988; crisis messages make the medium step out of character. Photos are resized client-side and never stored. Rate limit: 3 readings and 80 chat calls per IP per day in KV `BRIDGE` (283ff0103cdd4cc4ad1326410bc91692).
- Production `ANTHROPIC_API_KEY` is not reaching the Pages runtime (both /api/bridge and /api/estimate-maintenance return "Not configured"; KV via getRequestContext works). Bridge route reads the key from getRequestContext().env first, then process.env. Fixed 2026-10-30: re-set the Pages secret from .env.local and redeployed (Brew approved); both routes answer in production.
- Removed the EV "Worth It?" vehicle estimator (/ev and /api/estimate-maintenance) and its /projects and /lab entries (Brew, 2026-10-30).
- Decision (Brew, 2026-10-30): /bridge keeps the full medium act. The mystical "real contact" framing is the hook that separates it from typing into any AI; the footer entertainment line stays. Considered and rejected: ChatGPT's suggestion to say up front that AI writes the letter.
- Decision (Brew, 2026-10-30): paid readings get a money-back guarantee. Every reading ends with a 1-5 "How did we do?"; anything under 3 asks what we got wrong, and the answer is kept (with the reading, if they allow it) to improve the prompts over time.
- Decision (Brew, 2026-10-30): paid readings at $14.99 USD on the MichelBrew Stripe account (acct_1SjRKP…, branded Carnivore Weekly). Hosted Checkout with an inline price and per-session branding (display name "The Rainbow Bridge", night colours, statement suffix RAINBOW BRIDGE); creates no Stripe products, prices or webhooks so other CW payment screens are untouched (Brew's condition). Guarantee: under 3 stars plus a short reason offers one free retry with new answers (same purchase), then an automatic full refund within 30 days. Chat stays free; the reading is what's paid for.
- Decision (Brew, 2026-10-31): leave /bridge payments on the shared Carnivore Weekly Stripe account for now; revisit later. Known gap: customers see CW on the hosted checkout (logo, tab title, Link line), receipt emails, and bank statements ("CARNIVOREC* RAINBOW BRIDGE"), which risks "unrecognised charge" disputes. Fix when revisited: Brew creates a separate "The Rainbow Bridge" Stripe account (statement descriptor RAINBOW BRIDGE, receipts on), saves its key to `secrets/api-keys.json` → `stripe_bridge.secret_key_live`; then swap the Pages secret and re-test. Optional interim: move checkout onto the page (embedded) to hide the hosted-page branding.
- Decision (Brew, 2026-10-31): umbrella brand "My Little Shadow" (mylittleshadow.com, registered at GoDaddy 2026-10-31) for a business celebrating the pet relationship across its whole life (living-pet readings, birthday letters, senior keepsakes); The Rainbow Bridge is its remembrance product. Medium act stays on the Bridge only. Home page design pending (Brew running a Claude Design prompt). Until then mylittleshadow.com redirects to /bridge via `src/middleware.ts`.
- Decision (Brew, 2026-10-31): My Little Shadow gets its own writer, Hazel (`.claude/agents/hazel.md`), modelled on the CW writer workflow but fully separate from Carnivore Weekly (no shared voice, names or links). Daylight voice for living pets, candlelight for the Bridge; drafts go to `docs/shadow-content/`, the main session publishes. First draft: "What they'd tell you" prompts (2026-10-31), awaiting Brew's calls on price/launch, guarantee, grief hand-off to the Bridge, and a host name.
- Decision (Brew, 2026-10-31): the living-pet reading gets the same money-back guarantee as the Bridge (under 3 stars plus a reason: one free retry or a full refund within 30 days). Grief hand-off from the living-pet host to The Rainbow Bridge approved. Host stays unnamed. Price and launch date still open, so it stays "Coming soon".
- Decision (Brew, 2026-10-31): the guarantee steers to "Try again with new answers, free" in the reading; there is no refund button in the results view. Refunds are requested by email to hello@mylittleshadow.com within 30 days and handled within 24 hours (refund via Stripe). Refund details live in the Bridge footer and Terms. Support replies within 24 hours. The My Little Shadow sites must not mention Carnivore Weekly (statement descriptor wording changed to "with RAINBOW BRIDGE in the description"). The /api/bridge refund action still exists but no UI calls it.
- Decision (Brew, 2026-10-31): refunds stay simple. Any refund request by email within 30 days is honoured, even after the one free retry (max two readings per purchase, enforced server-side). Watch for abuse and handle repeat cases individually; no wording change.
- Decision (Brew, 2026-10-31): What they'd tell you launches now at $9.99 USD, live straight away (no hidden test period). Same Stripe account and guarantee as the Bridge; statement suffix LITTLE SHADOW. Shares `/api/bridge` via a per-product config rather than a second route, so fixes land in one place.
