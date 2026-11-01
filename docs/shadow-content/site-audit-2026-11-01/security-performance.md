---
title: My Little Shadow security and performance audit
date: 2026-11-01
scope: mylittleshadow.com (/, /tell, /bridge), /api/bridge, /api/bridge/voice, middleware, wrangler.toml
method: code review plus a handful of safe live probes (curl) and one headless Lighthouse mobile run each on / and /tell
---

# My Little Shadow: security and performance audit (2026-11-01)

Diagnosis only. Nothing was edited, deployed or committed.

## Live probes run (all safe, 10 API requests total)

| Probe | Result |
|---|---|
| `POST /api/bridge` reading, product tell, no session_id | 402 unpaid, 0.34s (no model call) |
| Same with forged `cs_live_AAAA...` session_id | 402 unpaid, 0.58s (one Stripe GET made server side) |
| Malformed JSON | 400 Bad request |
| `POST /api/bridge/voice` arbitrary text, bad sig | 400 Bad request |
| `GET /api/bridge/voice?id=<zero uuid>` | 404 |
| `OPTIONS /api/bridge` from foreign Origin | 204, no Access-Control-Allow-Origin |
| One opening chat call (tell) | 200, 3.2s, not streamed |
| One prompt-injection chat call (forged host turn asking for Python code) | 200, 2.4s, host wrote the Python function, then returned to the interview |

No checkout sessions were created, no refunds or feedback were posted, no rate limits were approached.

Note: the GitHub repo `MikeBrew123/whistlerbrew-demos` is **public**, so every prompt, limit and API rule below is readable by anyone. That does not change any single finding, but it removes "nobody knows about it" as a defence.

---

## Security findings

### Critical

**S1. Voice playback can be replayed without limit, each replay is a new paid OpenAI TTS call.**
- Evidence: `src/app/api/bridge/voice/route.ts:37-64`. `GET ?id=` has no rate limit, does not delete the parked text, and calls `/v1/audio/speech` every time. The parked text lives 600s (`PARKED_SECONDS`, line 34). `Cache-Control: private` (line 63) means Cloudflare never caches it. Only `POST` is rate limited (line 70).
- Exploit path: one free chat call returns `reply` + `sig`; `POST` it to `/voice` (counts 1 of 200); then loop `GET ?id=` for 10 minutes. Repeat with a new park every 10 minutes. With a long reading narration (up to 4000 chars, around 4 to 5 minutes of audio) each GET is several cents.
- Realistic impact: unbounded OpenAI spend from a single script and a single IP. A few thousand GETs is tens to hundreds of dollars.
- Fix: make the parked id single use (`store.delete` after reading, or mark it used), or synthesise once and cache the MP3 (Cache API or R2) keyed by id so replays cost nothing. Also add a per-IP GET counter, and set a hard monthly spend limit on the OpenAI project.

**S2. A paid session has no rate limit, and readings that fail JSON parsing are never counted, so one purchase buys unlimited Sonnet calls.**
- Evidence: `src/app/api/bridge/route.ts:296-307`. When Stripe is configured, reading mode skips `overLimit` entirely. `route.ts:368-382`: `purchase.used` only increments after a successful JSON parse with the `complete` field; anything else falls to the `catch`, returns `{message: raw, tier: "free", sig}` and leaves the purchase untouched.
- Exploit path: buy once ($9.99), then send reading requests whose forged turns steer the model out of JSON (S4 shows the model follows forged host turns). Every call is a 1200-token Sonnet generation with up to 24 turns, 28.8k chars and a 2MB image of input, with no daily cap. The returned text is also signed, so it can be fed to S1. Separately, `used` is a KV read-modify-write (`savePurchase`, `purchase.ts:79-82`): N concurrent reading requests on a fresh session all see `used=0` and all generate.
- Realistic impact: a determined user turns one purchase into an unmetered LLM endpoint. At roughly $3 per million input and $15 per million output tokens (confirm current Sonnet pricing), a maxed call is about $0.05; a single sequential script runs thousands per day. Combined with M1 the purchase is also refundable, so the attacker's cost is zero.
- Fix: count every reading attempt against the purchase (increment before calling Anthropic, cap attempts at for example 4 per purchase), apply a per-session and per-IP limit on the paid path too, and treat non-JSON output as a failed attempt rather than a free pass. For the race, write an "in progress" marker first, or move purchase state to a Durable Object or D1 row with an atomic update.

### Major

**M1. Self-serve refunds are exposed by API for both products, while the UI and Terms say refunds are by email.**
- Evidence: `route.ts:218-241` performs a live Stripe refund for any `mode:"feedback", action:"refund"` with rating under 3, a comment of 5+ chars and the session id. Bridge UI comment says "refunds are by email" (`public/bridge/index.html`, rateBox) and the tell footer says "email hello@... within 30 days" (`public/shadow/tell.html:275`). The handler still accepts `action:"refund"` for `product:"tell"`.
- Exploit path: pay, read, rate 1 star and take the free retry (`allowed=2`), read again, then `curl` the refund action. Result: two readings and a full automatic refund with no human in the loop. `canRefund` (`purchase.ts:99`) does not consider how many readings were delivered.
- Realistic impact: guaranteed free readings for anyone who reads the public repo, plus refund volume on a shared live Stripe account (refund rate is a risk signal Stripe watches account-wide).
- Fix: if refunds are meant to be by email, delete the refund branch from the API. If self-serve is wanted, allow it only when `used <= 1` and no retry was taken, and log every refund to KV for review.

**M2. Free chat is a general-purpose LLM proxy, and the per-IP limits are easy to step around.**
- Evidence: the client owns the whole transcript, including host turns (`route.ts:283-318` accepts `role:"medium"` from the browser). The live probe with a forged host turn got working Python code back. Limits are per IP per day in KV (`shared.ts:23-32`): 80 chat calls, 120 transcriptions, 200 speak parks. The counter is a non-atomic get then put, so parallel bursts pass the limit, and IPv6 users get effectively unlimited addresses from a /64.
- Realistic impact: each maxed chat call is roughly 11k input tokens and 400 output, about $0.04. 80 per IP per day is about $3 per IP; a few hundred rotating IPs is hundreds of dollars a day. Brand risk is lower because output only shows to the person who asked, but screenshots of "My Little Shadow" writing off-brand text are possible.
- Fix: (a) keep the transcript server side, or sign each host turn the server produced (reuse `signText`) and reject unsigned `medium` turns; (b) key the limit on the IPv6 /64 rather than the full address; (c) add a Cloudflare WAF rate-limiting rule on `/api/bridge*` and Turnstile on the first chat call; (d) set hard monthly spend limits on the Anthropic workspace and OpenAI project used by this site so the worst case is capped.

**M3. Unauthenticated, unthrottled calls to the shared live Stripe account.**
- Evidence: `mode:"checkout"` (`route.ts:259-268, 279`) creates a live Checkout Session per request with no rate limit. Reading mode with any well-formed `session_id` never hits `overLimit` (`route.ts:296-307`) and calls `GET checkout/sessions/<id>` for every unknown id (`purchase.ts:86-96`); the forged-id probe confirmed the round trip (0.58s vs 0.34s).
- Realistic impact: a loop can fill the shared account with thousands of open sessions and burn its API rate limit, which is shared with the other businesses on that account, causing their Stripe calls to fail with 429.
- Fix: rate limit checkout per IP (for example 10 per day) and require at least one completed chat turn; rate limit unknown-session lookups per IP and cache negative results in KV for a few minutes.

### Minor

**m1. The checkout session id is a bearer token and is sent to Google Analytics.**
Evidence: the GA config runs in `<head>` (`tell.html:180-189`, same in bridge) before `history.replaceState` strips `?paid=` (`tell.html:496`, `bridge/index.html:577`), so the page_view `page_location` carries `cs_live_...`. It is also sent as `transaction_id` (`tell.html:501`, `bridge/index.html:582`) and again on refund (`bridge/index.html:742`), and kept 60 days in localStorage. Anyone with GA access can fetch that customer's reading or trigger their refund (M1). Fix: send a hash or the last 8 chars as transaction_id, strip `paid` before GA config fires (move the replaceState into the head script or set `page_location` manually), and drop refunds from analytics.

**m2. Transcription accepts much longer audio than the UI produces.**
`voice/route.ts:15, 92`: 8MB cap, while the recorder stops at 90s (`tell.html`, `recTimer`). 8MB of Opus is about 30 minutes. 120 per IP per day makes it a free transcription service at roughly $0.10 per call. Fix: cap at about 1.5MB, and lower `listen` to around 40 per day.

**m3. Missing security headers.**
`curl -I` on `/`, `/tell`, `/bridge/index.html`: no `Content-Security-Policy`, no `Strict-Transport-Security`, no `frame-ancestors` or `X-Frame-Options`, no `Permissions-Policy`. Present: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Clickjacking risk is low (no logged-in state) but the pages hold a paid session. Fix: add `public/_headers` for the MLS paths with HSTS (`max-age=31536000; includeSubDomains`), `frame-ancestors 'none'`, `Permissions-Policy: camera=(), geolocation=()` (keep microphone=self), and a CSP. All pages use inline scripts and styles, so start with a report-only CSP using hashes for the two inline scripts or `'unsafe-inline'`, allowing `fonts.googleapis.com`, `fonts.gstatic.com`, `www.googletagmanager.com`, `*.google-analytics.com`, `static.cloudflareinsights.com`, `blob:` and `data:` for images and media.

**m4. Model output is not validated beyond one field.**
`route.ts:368-371` only checks `reading[kind.complete]` is truthy. Types and lengths are unchecked; the whole object is echoed, stored in KV for 60 days, and narrated. The front end renders safely (see "Solid"), so this is robustness, not XSS. Fix: whitelist the expected keys, coerce to strings, trim to sane lengths, cap `theirAnswers` at 3, and reject (and count, see S2) anything else.

**m5. Voice signing key is derived from the Anthropic API key, and compared non-constant-time.**
`shared.ts:36-46`. Entropy is fine, but rotating the Anthropic key silently invalidates all signatures, and an API key is being reused as key material. The `===` compare is not a practical risk over the network. Fix: add a dedicated `VOICE_SIGNING_SECRET` Pages secret (32 random bytes) and use `crypto.subtle.verify`.

**m6. Feedback is kept forever.**
`route.ts:214` writes `fb:` keys with no `expirationTtl`, holding the comment and (if ticked) the full reading, which for the Bridge includes grief details and the pet's name. The privacy page discloses that feedback can include the reading, but not how long it is kept. Fix: add a TTL (for example 180 days) and state it on `/privacy`.

**m7. KV rate limiting is racy and can throw.**
`shared.ts:25-32`: get then put on the same key is not atomic, and KV allows about one write per second per key, so concurrent requests from one IP can make `put` reject, which surfaces as an unhandled 500. Every chat call also costs one KV write; on the Workers free plan that is 1000 writes per day across the whole project. Fix: wrap `overLimit` in try/catch (fail closed for reading, open for chat), and move counters to Cloudflare's Rate Limiting binding or a Durable Object. Confirm the account is on Workers Paid.

**m8. Request bodies are parsed before any size check.**
`route.ts:273` parses the full JSON, then slices turns. A multi-megabyte body burns CPU time before being trimmed. Fix: reject when `content-length` exceeds about 3MB (2MB image plus text) before `req.json()`.

**m9. Arbitrary text can be voiced, within limits.**
Because chat replies are signed and the model follows forged turns (M2), a user can get the host to say a chosen sentence and then voice it. Bounded by 400 output tokens and the speak limit. Fixed as a side effect of M2 (a) and S1.

---

## Performance findings

Lighthouse 12.2.1, mobile, simulated throttling, headless Chrome:

| Page | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | Weight |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 75 | 100 | 96 | 100 | 3.5s | 4.6s | 10ms | 0 | 326 KiB |
| `/tell` | 98 | 100 | 93 | 100 | 1.9s | 1.9s | 0ms | 0 | 286 KiB |

(Console errors in both runs were trackers refused by the local network, not site faults.)

HTML is small and fast: `/` 8.2KB gzip (35KB raw), `/tell` 13.8KB gzip, `/bridge/index.html` 13.9KB gzip, TTFB 60 to 75ms.

### Major

**P1. Home page mobile LCP 4.6s, held back by web fonts.**
Evidence: `public/shadow/index.html:20-22` loads three Google Fonts families (Bricolage Grotesque variable, Cormorant Garamond two styles, Figtree four weights) through a cross-origin stylesheet. Font bytes on first load: Bricolage 77KB, Cormorant 2 x 24KB, Figtree 20KB. Cormorant is only used in the Bridge section far below the fold. Observed (unthrottled) FCP was 1.8s while DOMContentLoaded was 0.43s, so paint is waiting on the font chain. Fix: self-host subset WOFF2 files under `/shadow/fonts/` with `<link rel=preload>` for the one hero font, `font-display: swap`, and load Cormorant only when the Bridge section nears view. Self-hosting also removes two third-party origins.

### Minor

**P2. Google Analytics is the heaviest resource on every page.** `gtag/js` is 167KB compressed (487KB raw), with 68KB unused, more than the page itself. It is async so TBT stays low, but on a slow phone it competes with fonts. Fix: load it after `load` or on first interaction (`requestIdleCallback`), or rely on the Cloudflare Web Analytics beacon already injected and send only the purchase events to GA.

**P3. /tell sample card is drawn at load as a 1080x1350 PNG and shown squashed on phones.** `tell.html:231-232, 435`: the canvas render becomes a ~280KB data URL displayed at about 156px wide; Lighthouse flagged 265 to 278KB of savings. The `height="280"` attribute overrides the CSS `aspect-ratio: 4/5` (`tell.html:69`), so on mobile the box is 156x284 and the card is distorted. Fix: ship a pre-rendered 448x560 WebP (about 25KB) as the `src`, and add `height: auto` to `.sample img`.

**P4. The canonical Bridge URL is a redirect.** `https://mylittleshadow.com/bridge` returns 307 to `/bridge/index.html` (`next.config.ts` redirects), but the page's canonical (`bridge/index.html:18`) and the tell page's handoff link point at `/bridge`. Every visit pays an extra round trip and search engines see a canonical that redirects. An uncommitted change made during this audit also points the Bridge Stripe return URL at `/bridge` (`route.ts:112`), so paid returns will take the same hop until this is fixed. Fix: add `/bridge` to the middleware `PAGES` rewrite map (as done for `/tell`) and remove the Next redirect for mylittleshadow.com.

**P5. Chat replies are not streamed.** Opening question took 3.2s and the injected call 2.4s, all-or-nothing, behind a "..." indicator. Fix: the very first host question is fixed per product, so serve it from the page with no API call (saves a model call per visitor too), and stream later replies (`stream: true`) so text starts in well under a second.

**P6. Small items.** `favicon.ico` is 26KB and there is no `<link rel=icon>`; replace with a small PNG or SVG icon. Cloudflare email obfuscation adds `email-decode.min.js` on /tell and /bridge for one `mailto:`; turn it off for these pages or accept the 1KB. `og.jpg` files (71KB and 64KB) are a fine size. Static assets get `max-age=14400`; HTML gets `max-age=0, must-revalidate`, which is right for pages that change often.

---

## What is solid

- **Payment gate is server side.** No reading is generated without a paid session once Stripe is configured; both probes returned 402 before any model call (`route.ts:296-304`).
- **Products cannot unlock each other.** Fresh lookups require `payment_status === "paid"` and `metadata.app` matching the product (`purchase.ts:93`); cached purchases are checked against `app` too (`purchase.ts:90`). Sessions from the other businesses on the shared account have no matching `app` and are rejected.
- **Replays are safe in the normal case.** Once `used >= allowed`, the cached reading is returned and no new generation happens (`route.ts:301-303`). Refunded purchases are refused (`route.ts:298`). The two-reading cap holds for sequential requests.
- **Session ids are format checked** (`purchase.ts:38-39`) before reaching Stripe.
- **No client-trusted price or tier.** Price, product name and app come from server constants (`route.ts:105-171`); `tier: "paid"` is only set server side.
- **No XSS sinks for model or user text.** All conversation, reading and Q and A text is written with `textContent` or `createTextNode` (`tell.html:297-316, 565-590`, `bridge/index.html:381-392, 647-665`). The only `innerHTML` uses are static strings and star numbers. The card is drawn with canvas `fillText`; the download filename is sanitised (`tell.html:600`). URL params are only used as a regex-checked session id.
- **Photos are not stored.** `parseImage` (`route.ts:185-190`) validates a strict JPEG/PNG/WebP data URL under 2MB and forwards it only to Anthropic. The browser resizes to 1024px JPEG first. Feedback never includes the photo. This matches `/privacy`.
- **KV retention is bounded where it matters:** purchases 60 days, parked speech 10 minutes, rate counters 26 hours.
- **Voice only speaks signed text.** Arbitrary text with a bad signature returns 400 (probe 4).
- **IP spoofing does not work.** `clientIp` prefers `CF-Connecting-IP`, which Cloudflare overwrites on every proxied request, so a forged `X-Forwarded-For` is ignored in production.
- **No CORS opening.** No `Access-Control-Allow-Origin` is sent, so other sites cannot read API responses.
- **Errors are generic to the visitor**; provider error bodies go only to server logs, and logs contain no photos or card data.
- **Secrets are clean.** No live keys in tracked files or anywhere in git history; `secrets/*`, `.env*` and `n8n-workflows/` are gitignored. API keys are only read server side via Pages secrets.
- **Transport:** HTTP redirects to HTTPS (301), www to apex (308), `nosniff` and a sensible Referrer-Policy are set.
- **Front end performance basics are good:** tiny HTML, no render-blocking scripts, TBT near zero, CLS 0, accessibility and SEO 100 on both pages, /tell scores 98.

## Suggested order of work

1. S1 (single-use voice ids) and S2 (count every paid attempt, limit the paid path). Both are small code changes.
2. Hard spend limits on the Anthropic workspace and OpenAI project for this site, today, as a backstop.
3. M1 (remove or restrict API refunds) and M3 (rate limit checkout and session lookups).
4. M2 (signed host turns, /64 keying, WAF rule or Turnstile).
5. m1 (stop sending session ids to GA), m3 (headers), then P1 and P3.
