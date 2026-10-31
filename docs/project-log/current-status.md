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

## 2026-10-10 Sayulita Today (/sayulita)
- Static page public/sayulita/index.html + data.json, pushed twice a day by the Mac Mini (project-nexus/trip/public/sayulita_page.py via GitHub Contents API, same PAT as shopping). Client-side Open-Meteo beach strip, ES toggle from data.es map, Nightlife/Fitness/Other and Drinks/Food tabs, festival day programs. Koozie NFC tag points here.

## The Rainbow Bridge (/bridge), added 2026-10-30
- Live page: https://whistlerbrew.com/bridge (listed on /projects). API: /api/bridge (modes chat and reading), KV `BRIDGE` for rate limits.
- Verified locally end to end (chat, photo vision, reading, keepsake card, mobile 375px, crisis reply). Production verified 2026-10-30 after re-setting the Pages `ANTHROPIC_API_KEY` secret (also fixed /api/estimate-maintenance). Est. cost ~3 to 5 cents US per full reading on Sonnet 5.5.
- Feedback (2026-10-30): every reading ends with "How did we do?" 1-5. Under 3 asks what we got wrong. Entries live in KV `BRIDGE` under `fb:<ms>:<id>` (rating, comment, optional reading JSON). Read them with `npx wrangler kv key list --namespace-id 283ff0103cdd4cc4ad1326410bc91692 --prefix fb:` then `kv key get`. Money-back guarantee copy is in the hidden `.deeper` paid slot, shown once Stripe is live.
- Payments (2026-10-30): code live in `src/app/api/bridge/purchase.ts`. Tested end to end in Stripe test mode locally (pay, reading, retry, refund confirmed in Stripe). LIVE 2026-10-30: production verified with the test key (purchase, reading, refund on whistlerbrew.com), then Pages `STRIPE_SECRET_KEY` switched to the live key (Brew approved); production now creates cs_live_ checkouts and blocks unpaid readings. No real-card purchase has been run yet. `.env.local` keeps the test key for local dev. Checkout still shows CW logo, "Carnivore Weekly" in receipts/terms; only a separate Stripe account fully fixes that.
- Voice (2026-10-31): the medium speaks (OpenAI gpt-4o-mini-tts, voice `sage`, constant `VOICE` in `src/app/api/bridge/voice/route.ts`) and visitors can tap a mic to answer (gpt-4o-mini-transcribe). Speech only reads HMAC-signed medium text; audio streams via POST park → GET ?id. LIVE 2026-10-31: Pages secret `OPENAI_API_KEY` set (Brew approved); verified on whistlerbrew.com (speech starts in ~1.5s, transcription works, toggle and mic show). Note: Cloudflare 403s python-urllib's default user agent; scripts need a browser-like UA. Approx cost: about 6 cents of speech per full session.

## My Little Shadow (mylittleshadow.com), added 2026-10-31
- Home page `public/shadow/index.html`, built from Brew's Claude Design export (runtime replaced by a small script). Live at whistlerbrew.com/shadow; `src/middleware.ts` serves it at mylittleshadow.com/ once DNS is connected (connected 2026-10-31: Cloudflare zone on the free plan (nameservers hal/sasha.ns.cloudflare.com, set at GoDaddy), GoDaddy parking records removed, mylittleshadow.com and www added as Pages custom domains; waiting on nameserver propagation).
- Live products: The Rainbow Bridge (/bridge, $14.99) and What they'd tell you (/tell, $9.99, living-pet reading, launched 2026-10-31). Birthday letters and "their story so far" show Coming soon. No Spanish version yet.
- Printed keepsake cards (2026-10-31): shown as Coming soon with an "I'd want one" button on the home page (end of daylight) and under the keepsake card after a Bridge reading. Counts per page in BRIDGE KV, no personal details: `npx wrangler kv key get "interest:printed-card:home" --namespace-id 283ff0103cdd4cc4ad1326410bc91692` (and `:bridge`). Started at zero on 2026-10-31.
- Analytics (2026-10-31): GA4 property "My Little Shadow" `properties/561753960`, measurement ID `G-6KL3XFSD8V`, in Brew's iambrew.com GA account (created with the CW service account). Tag loads only on mylittleshadow.com. Events: light_candle, begin_checkout, purchase, reading_given, rate_reading, free_retry, refund, want_printed_card. Key events: purchase, begin_checkout, want_printed_card.
- Search Console: verification file `public/google6e9e7a1290118832.html` is deployed (Site Verification API enabled 2026-10-31 in GCP project 243427170131). PENDING the DNS move: verify `https://mylittleshadow.com/` via the API, add it to Search Console, add iambrew@gmail.com as an owner, submit a sitemap. Then consider redirecting whistlerbrew.com/bridge to mylittleshadow.com/bridge so all traffic lands in one property.
- LIVE on mylittleshadow.com (2026-10-31): home page at /, Bridge at /bridge, share images, chat, voice and live Stripe checkout verified on the new domain. whistlerbrew.com/bridge and /shadow 308-redirect to mylittleshadow.com (query kept for Stripe returns). Search Console: https://mylittleshadow.com/ verified (file method), iambrew@gmail.com added as owner, sitemap `/shadow/sitemap.xml` submitted. Note: this MacBook's network caches DNS, so local lookups lagged ~15 min behind the real switch; test with `--resolve` or DNS-over-HTTPS.
- Legal pages (2026-10-31): /privacy, /terms, /contact on mylittleshadow.com (files `public/shadow/{privacy,terms,contact}.html`, source draft `docs/shadow-content/2026-10-31-privacy-terms-contact.md`). Modelled on Carnivore Weekly's pages: British Columbia law, no named operator, statement descriptor CARNIVOREC* RAINBOW BRIDGE disclosed. hello@mylittleshadow.com: Resend domain 7ce9dd7b-15b8-4e59-8698-7e27e20fc662 created (sending + receiving), all 5 DNS records added in Cloudflare 2026-10-31 and resolving publicly; verified 2026-10-31. Resend inbox hello@mylittleshadow.com (id f3faa0a7-3743-4587-a8f8-9180e45d6ba1, from name "My Little Shadow") receives and sends; self-test passed. Watched by the Mini job `com.minibrew.mls-inbox` (08:30 and 16:30, `~/bin/mls-inbox-check.py`, no AI): Telegram alert on new mail, refund requests, repeat refunders and anything unread over 20 hours. Copy of the script: `scripts/mls-inbox-check.py` (the Mini runs `~/bin/mls-inbox-check.py`).
- What they'd tell you (2026-10-31, LIVE): page `public/shadow/tell.html`, served at mylittleshadow.com/tell (middleware rewrite; whistlerbrew.com/shadow/tell.html 308s there). Same backend as the Bridge: `/api/bridge` with `product: "tell"` picks Hazel's prompts (`docs/shadow-content/2026-10-31-what-theyd-tell-you-prompts.md`), $9.99 USD hosted Checkout (metadata.app `what-theyd-tell-you`, display name "My Little Shadow", statement suffix LITTLE SHADOW, returns to /tell), and the same guarantee (free retry under 3 stars; refunds by email). Purchases are tied to their product's app, so a $9.99 session can't unlock a Bridge reading; old KV purchases without `app` count as Bridge. Voice: `/api/bridge/voice` takes `tone: "tell"` (OpenAI voice coral, playful instructions). Feedback in KV `fb:` now carries `app`. GA events: start_tell, begin_checkout, purchase, reading_given/rate_reading/free_retry (with product), want_printed_card (from tell). Home page hero CTA and the journey card link to /tell. Terms, Privacy, Contact and sitemap updated.
  - NOT verified live (the cloud session that built it couldn't reach mylittleshadow.com). Tested only locally with a mocked API, plus a clean `next build`. To check: load /tell, run a chat (real Claude), then one real $9.99 purchase and refund to prove the Stripe return, reading and KV purchase. The LITTLE SHADOW statement suffix is untested against Stripe's length rules.
