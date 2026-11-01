# My Little Shadow: SEO and metadata audit (2026-11-01)

Scope: mylittleshadow.com live (curl with cache-busting query, Googlebot UA), repo files in `public/shadow/`, `public/bridge/`, `src/middleware.ts`, `next.config.ts`, plus Search Console (read-only URL Inspection and sitemap status). No browser used. Nothing edited.

Live HTML matches the repo files byte for byte, except Cloudflare Email Obfuscation rewriting every `mailto:` link (see m6).

## Per-page table

| URL | Status (direct) | Title (chars) | Meta description (chars) | Canonical | og:image | H1 / H2s | JSON-LD | GSC (2026-11-01) |
|---|---|---|---|---|---|---|---|---|
| `/` | 200 | My Little Shadow (16) | Hear what your pet has been trying to tell you. Readings, letters... (146) | `/` OK | shadow/og.jpg 1200x630, 71 KB, alt set | 1 H1, 3 H2, 7 H3 | Organization + WebSite | Submitted and indexed, crawled 10-31 |
| `/tell` | 200 | What they'd tell you \| My Little Shadow (39) | A playful reading in your pet's own voice... (122) | `/tell` OK | shadow/og.jpg, alt set | 1 H1, no H2 | Product, $9.99 USD, return policy | Discovered, not indexed |
| `/bridge` | **307 to /bridge/index.html** | The Rainbow Bridge (18) | Light a candle and hear from a pet who has crossed the Rainbow Bridge. (70) | `/bridge` (a redirecting URL) | bridge/og.jpg 1200x630, 64 KB, alt set | 1 H1, no H2 | Product, $14.99 USD, return policy | Discovered, not indexed |
| `/what-would-my-dog-say` | 200 | What would my dog say? 9 dog habits, in their words (51) | If your dog could talk... (132) | OK | shadow/og.jpg, **no alt, no width/height** | 1 H1, 12 H2 | Article + FAQPage (3 Q) | Unknown to Google |
| `/what-is-my-cat-thinking` | 200 | What is my cat thinking? 9 cat habits, in their words (53) | Ever wondered what your cat is thinking?... (129) | OK | shadow/og.jpg, no alt/dims | 1 H1, 12 H2 | Article + FAQPage (3 Q) | Discovered, not indexed |
| `/questions-to-ask-your-dog` | 200 | Questions to ask your dog if they could talk (44) | The questions every dog and cat person wants answered... (138) | OK | shadow/og.jpg, no alt/dims | 1 H1, 6 H2, 8 H3 | Article + FAQPage (3 Q) | Discovered, not indexed |
| `/privacy` | 200 | Privacy \| My Little Shadow (26) | What My Little Shadow does with your conversation... (93) | OK | **none (no OG tags)** | 1 H1, 14 H2 | none | Discovered, not indexed |
| `/terms` | 200 | Terms \| My Little Shadow (24) | The plain-language terms for readings... (94) | OK | none | 1 H1, 12 H2 | none | Unknown to Google |
| `/contact` | 200 | Contact \| My Little Shadow (26) | How to reach My Little Shadow... (84) | OK | none | 1 H1, 3 H2 | none | Discovered, not indexed |

All pages: `lang="en"`, viewport present, charset utf-8, no robots meta, no X-Robots-Tag, no hreflang (correct), no em-dashes or en-dashes in source, all titles and descriptions unique. No `<link rel="icon">` or apple-touch-icon on any page. Twitter tags are `twitter:card` (+ `twitter:image` on home, tell, bridge); title and description fall back to OG, which is fine.

### Redirects and duplicates (live)

| Request | Result |
|---|---|
| `http://mylittleshadow.com/` | 301 (Cloudflare) to https, 200. OK |
| `https://www.mylittleshadow.com/` | 308 to apex, 200. OK |
| `http://www.mylittleshadow.com/tell` | 301 to https www, 308 to apex. 2 hops, acceptable |
| `/tell/`, `/what-would-my-dog-say/` | 308 to no-slash. OK |
| `mylittleshadow.com/bridge` | **307 to /bridge/index.html** (next.config redirect) |
| `mylittleshadow.com/bridge/` | 308 /bridge, 307 /bridge/index.html |
| `mylittleshadow.com/shadow/tell.html`, `/shadow/index.html`, `/shadow/privacy.html`, `/shadow/articles/*.html` | 200 duplicates (canonical tag points to clean URL) |
| `mylittleshadow.com/shadow/` | 308 /shadow, 307 /shadow/index.html, 200 duplicate of home |
| `whistlerbrew.com/bridge` | 307 /bridge/index.html, 308 mylittleshadow.com/bridge, 307 /bridge/index.html, 200 (3 hops, two temporary) |
| `whistlerbrew.com/bridge/` | 4 hops |
| `whistlerbrew.com/shadow` | 307, 308 to mylittleshadow.com/, 200 (2 hops) |
| `whistlerbrew.com/shadow/index.html`, `/shadow/tell.html` | single 308 to clean URL. OK |
| `whistlerbrew.com/shadow/privacy.html`, `/shadow/terms.html`, `/shadow/contact.html`, `/shadow/articles/*.html` | **200 on whistlerbrew.com**, not redirected, not noindexed (canonical to mylittleshadow.com is the only guard) |
| `mylittleshadow.com/robots.txt` | 200, Cloudflare managed "content signals" text, comments only: no User-agent, no Sitemap line. Not the whistlerbrew one (whistlerbrew.com/robots.txt is 404) |
| `mylittleshadow.com/sitemap.xml` | 404 |
| `mylittleshadow.com/favicon.ico` | 200, but it is the Next.js starter default black triangle (`src/app/favicon.ico`) |
| `mylittleshadow.com/apple-touch-icon.png` | 404 |

Search Console sitemap: `https://mylittleshadow.com/shadow/sitemap.xml` submitted 2026-11-01, pending, 9 submitted, 0 indexed, 0 errors.

## Findings

### Critical

**C1. `/bridge` is a 307 redirect, but it is the canonical, og:url, sitemap URL and Product URL.**
Evidence: `curl -I https://mylittleshadow.com/bridge` gives `307 location: /bridge/index.html`. Source is `next.config.ts` `redirects()` entry `{ source: '/bridge', destination: '/bridge/index.html', permanent: false }`, which runs before middleware, and `/bridge` is not in the middleware `PAGES` map. The page at `/bridge/index.html` declares `<link rel="canonical" href="https://mylittleshadow.com/bridge">`, so Google sees a canonical that redirects to the page that names it: a loop with no stable indexable URL. GSC shows `/bridge` as "Discovered, currently not indexed" and the sitemap lists a redirecting URL. The whistlerbrew.com/bridge 308 lands on the same loop (3 to 4 hops, two of them temporary).
Fix: in `src/middleware.ts` add `"/bridge": "/bridge/index.html"` to `PAGES` and `"/bridge"` to the matcher; in `next.config.ts` stop the `/bridge` redirect from firing on mylittleshadow.com, e.g. `{ source: '/bridge', missing: [{ type: 'host', value: 'mylittleshadow.com' }], destination: 'https://mylittleshadow.com/bridge', permanent: true }` (this also collapses whistlerbrew.com/bridge to one 308). Also add `"/bridge/index.html": "/bridge"` handling on the mylittleshadow host (see M3). Change both home links `href="/bridge/index.html"` (public/shadow/index.html lines 300 and 337) to `href="/bridge"`.

### Major

**M1. Bridge meta description implies contact with a pet that has died (content rule: no psychic claims).**
Evidence: `<meta name="description">` and `og:description` = "Light a candle and hear from a pet who has crossed the Rainbow Bridge." JSON-LD Product description: "A gentle reading from a pet who has died, in their own voice". "Hear from" a deceased pet reads as a medium claim in a SERP snippet with no surrounding context.
Fix: description and og:description: "Light a candle for a pet you miss and receive a gentle letter in their voice, written from the memories you share." Product description: "A gentle letter in your pet's voice, written from the memories you share, plus a keepsake card. Money back if it doesn't feel like them."

**M2. Live /bridge copy promotes the free retry (content rule).**
Evidence (body, not metadata, but crawled and snippet-eligible): public/bridge/index.html line 318, "Our promise: if a reading doesn't feel like them, try again free from your reading, or email ... within 30 days for a full refund". /tell already uses the compliant wording.
Fix: replace with the /tell wording: "Our promise: if a reading isn't right for you, email hello@mylittleshadow.com within 30 days for a full refund, handled within 24 hours."

**M3. Sitemap lives at `/shadow/sitemap.xml`, robots.txt does not reference any sitemap, and `/sitemap.xml` is 404.**
Evidence: robots.txt is Cloudflare's managed content-signals text only (no `User-agent`, no `Sitemap:`). Under the sitemaps protocol a sitemap at `/shadow/sitemap.xml` only covers URLs under `/shadow/`, yet every URL it lists is at the root. GSC accepted it (property owner), but other engines (Bing) and crawlers discovering it via robots.txt will not, and the file is still "pending, 0 indexed".
Fix: in middleware, on the mylittleshadow host, rewrite `/sitemap.xml` to `/shadow/sitemap.xml` and `/robots.txt` to a new `/shadow/robots.txt` containing `User-agent: *`, `Allow: /`, `Sitemap: https://mylittleshadow.com/sitemap.xml` (Cloudflare's managed block is prepended to the origin file, so both coexist). Add both paths to the matcher. Resubmit `https://mylittleshadow.com/sitemap.xml` in GSC (owner action).

**M4. Favicon is the Next.js starter default triangle; no apple-touch-icon.**
Evidence: `/favicon.ico` md5 matches `src/app/favicon.ico` (black circle, white triangle). No page has `<link rel="icon">`; `/apple-touch-icon.png` is 404. Google shows the favicon beside mobile results.
Fix: add `public/shadow/favicon.svg` (or .png, square, at least 48x48) and `public/shadow/apple-touch-icon.png` (180x180), then add to every page head (and to the `scripts/mls-article.py` template): `<link rel="icon" href="/shadow/favicon.svg" type="image/svg+xml">` and `<link rel="apple-touch-icon" href="/shadow/apple-touch-icon.png">`. Optionally rewrite `/favicon.ico` on the mylittleshadow host to a brand .ico.

**M5. whistlerbrew.com still serves 200 copies of privacy, terms, contact and the three articles; mylittleshadow.com serves 200 copies at `/shadow/*.html`.**
Evidence: `whistlerbrew.com/shadow/privacy.html` and `whistlerbrew.com/shadow/articles/what-would-my-dog-say.html` return 200 with identical HTML; `mylittleshadow.com/shadow/tell.html`, `/shadow/index.html`, `/shadow/articles/*.html` return 200. The absolute canonical tag mitigates, but these are crawlable duplicates and the whistlerbrew ones split signals across domains.
Fix: extend `MOVED` in `src/middleware.ts` with `"/shadow/privacy.html": "/privacy"`, `"/shadow/terms.html": "/terms"`, `"/shadow/contact.html": "/contact"`, and the three `"/shadow/articles/<slug>.html": "/<slug>"` entries, add them to the matcher, and apply `MOVED` on the mylittleshadow host too (308 to the clean path) so `/shadow/tell.html` and `/shadow/index.html` stop answering 200 there.

**M6. Return policy markup: `applicableCountry` "CA" only, and FreeReturn on a digital item.**
Evidence: both Products: `"priceCurrency": "USD"`, `"hasMerchantReturnPolicy": {"applicableCountry": "CA", "returnPolicyCategory": "MerchantReturnFiniteReturnWindow", "merchantReturnDays": 30, "returnFees": "FreeReturn"}`. Prices are USD and the 988 / ASPCA lines target the US too, so US buyers are excluded from the stated policy. `FreeReturn` describes shipping an item back; nothing is returned here, it is a refund.
Fix: `"applicableCountry": ["CA", "US"]`, keep `MerchantReturnFiniteReturnWindow` and `merchantReturnDays: 30`, replace `returnFees` with `"refundType": "https://schema.org/FullRefund"` plus `"returnMethod": "https://schema.org/ReturnByMail"` only if Google's validator insists; otherwise drop `returnFees`. Simplest alternative: remove `hasMerchantReturnPolicy` entirely, since digital readings are not eligible for merchant listing rich results and the guarantee is stated in visible copy.

### Minor

**m1. Home title is the brand only.** "My Little Shadow" (16 chars) has no descriptive words; og:title is the same. Suggested: "My Little Shadow | Playful letters in your pet's voice" (54).

**m2. Home and /tell meta lean on "hear what your pet has been trying to tell you".** Home description and the shared og:description ("Hear what your little shadow has been trying to tell you.") can read as mind reading when shown out of context. /tell's own footer says "not mind reading". Suggested home description: "Playful readings, letters and keepsakes in your pet's voice, written from what you tell us about them, and The Rainbow Bridge for after." (138). Give /tell its own og:description matching its meta description instead of reusing home's.

**m3. Article OG images are generic and incomplete.** All three articles use `shadow/og.jpg` with no `og:image:alt`, `og:image:width/height` or `twitter:image`. Fix in `scripts/mls-article.py` (lines 155 to 160): add `og:image:width` 1200, `og:image:height` 630, `og:image:alt` (same alt as home), `twitter:image`; ideally a per-article 1200x630 image.

**m4. Legal pages have no OG or Twitter tags.** /privacy, /terms, /contact share as bare links. Add og:title, og:description, og:url, og:image (shadow/og.jpg) and twitter:card.

**m5. Titles on /tell and /bridge lack context.** og:title on /tell is "What they'd tell you" with no brand; /bridge title and og:title are "The Rainbow Bridge" with no brand, a generic phrase shared by many pet-loss pages. Suggested /bridge title: "The Rainbow Bridge | A letter from your pet | My Little Shadow" or shorter "The Rainbow Bridge | My Little Shadow".

**m6. Cloudflare Email Obfuscation changes crawled HTML.** Every `mailto:` becomes `/cdn-cgi/l/email-protection#...` with "[email protected]" text, so the FAQPage JSON-LD answers containing `hello@mylittleshadow.com` (dog Q3, cat Q3) no longer match the raw visible text exactly. Otherwise all 9 FAQ questions and answers match visible copy word for word. Fix: turn off Email Obfuscation for mylittleshadow.com (Scrape Shield) or add a Configuration Rule excluding it; low impact either way.

**m7. Organization logo is the 1200x630 photo.** `"logo": "https://mylittleshadow.com/shadow/og.jpg"`. Google wants a square-ish logo at least 112x112. Point it at the new square icon from M4.

**m8. Internal linking gaps.** Articles do not link to each other or to /bridge (only to / and /tell plus legal); /tell links all three articles; home links the bridge via `/bridge/index.html` (C1). Add a short "More guides" row to the article template linking the other two articles.

**m9. Sitemap lastmod lags.** `/tell` and the home/legal files were modified 2026-11-01 but list 2026-10-31. Update lastmod when content changes; otherwise harmless.

**m10. /tell and /bridge have a single H1 and no H2.** Acceptable for app-style pages, but /tell's visible explainer copy could carry one H2 ("How it works") for structure.

**m11. Product markup has no `priceValidUntil` and no image of the product itself.** Optional warnings only; do not add `review` or `aggregateRating` (none exist, and inventing them breaks the rules).

## Checked and fine

- HTTPS and www redirects are single permanent hops; trailing slashes 308 to the clean path.
- All titles under 60 chars, all descriptions 70 to 146 chars, all unique.
- Canonicals are absolute mylittleshadow.com clean URLs on all 9 pages and match the sitemap (except the /bridge redirect, C1).
- Sitemap lists all 9 public pages, valid XML, no 404s; only /bridge redirects.
- OG images reachable (200, image/jpeg, 1200x630, under 75 KB).
- One H1 per page; article H2s are logical question headings; the only `<img>` (/tell sample card) has descriptive alt.
- JSON-LD parses on every page; Article headlines match H1s; prices ($9.99 and $14.99 USD) match visible copy; no reviews or ratings invented; "9 habits" counts match 9 H2s.
- No em-dashes, en-dashes, psychic, translation or invented-number claims in any title or description (apart from the M1 and m2 wording risks).
- No hreflang (correct for a single-language site). `lang="en"` everywhere.
