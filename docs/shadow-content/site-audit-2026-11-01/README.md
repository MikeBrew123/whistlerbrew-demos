# My Little Shadow full site audit, 2026-11-01

Four parallel reviews. Each report has the evidence, with file and line references:
- [functional.md](functional.md): every page, link and flow, live in Chrome (nothing paid)
- [seo-metadata.md](seo-metadata.md): titles, descriptions, canonicals, structured data, sitemap, robots, Search Console
- [content.md](content.md): every customer-facing string and the AI prompts, checked against Brew's rules
- [security-performance.md](security-performance.md): payment enforcement, cost abuse, headers, page speed (Lighthouse)

## Fixed and live (2026-11-01, commits afe52bbda and 4ec99918c)

| Area | Problem | Fix |
|---|---|---|
| Cost | A voice clip link could be replayed without limit, each replay a paid OpenAI call | Each clip can be fetched 4 times |
| Cost | One paid session could buy unlimited Sonnet calls (failed readings were never counted) | Each purchase gets at most 4 extra reading attempts |
| Cost | Stripe checkout sessions could be created without limit | 10 per visitor per day |
| Money | The API offered a self-serve Stripe refund that no page offers | Removed; refunds are by email only, as Terms say |
| Analytics | Any `?paid=` link fired a GA4 purchase, and a fake one locked that browser out of buying for 60 days | Purchase counts only once the server confirms payment; an unpaid id is forgotten |
| Safety | After the host gave crisis numbers, the buy button could still be forced in after 7 messages | No buy button once 988 has come up |
| Brand | mylittleshadow.com served the whole whistlerbrew.com site (pushup, wildfire, projects) | The domain now serves only My Little Shadow pages; anything else is a plain 404 |
| SEO | /bridge redirected to /bridge/index.html, whose canonical pointed back to /bridge | /bridge is a stable 200; old file addresses 308 to the clean ones |
| SEO | Duplicate pages at /shadow/*.html | 308 to the clean address on both domains |
| SEO | robots.txt was Cloudflare's text only; /sitemap.xml was 404 | Own robots.txt with a Sitemap line; /sitemap.xml live and submitted to Search Console |
| Polish | Favicon was the Next.js starter triangle, no phone icon | Brand dot favicon (svg and ico) and apple-touch icon on every page |

Checked live after deploy: all 10 pages, robots, sitemap, icons and the Search Console file return 200; whistlerbrew.com pages (projects, pushup, wildfire, sayulita, wildfire data) unaffected.

## Needs Brew (copy, policy, or judgement)

1. **Free retry still promoted** in the Bridge footer, on Contact and on Privacy (same fix Brew approved for /tell).
2. **Money-back wording differs** on home, /tell, the guides, Terms, the Stripe checkout text and structured data; most say less than the real policy ("any request within 30 days"). One sentence, used everywhere.
3. **Privacy says feedback keeps the reading only if a box is ticked.** The code sends the reading with every 3 to 5 star rating, pre-ticks the box on low ratings, and keeps feedback forever. Recommend fixing the code to match the promise (send the reading only when ticked, unticked by default, delete after 12 months).
4. **Home page uses the medium act** ("a gentle medium helps you hear from them"), against the 2026-10-30 "medium act on the Bridge only" decision, and overclaims for /tell ("sounds exactly like them", "a little too accurate", "uncannily specific").
5. **AI disclosure on /tell**: the host is told not to mention being an AI unless sincerely asked; only the footer says it.
6. **Business identity** on Terms and Contact (no name or location), and the card statement wording in Terms is probably cut off by Stripe's 22-character limit.
7. **Checkout still shows Carnivore Weekly** (tab title, logo, Link line), and /tell checkout had no Apple Pay. Known; separate Stripe account is the fix.
8. **Hazel's brief is out of date** (lists /tell as Coming soon, says photos are "never stored").

## Not fixed yet (technical, lower priority)

- Free chat can be used as a general AI proxy within the IP limits, and the IP limits are easy to sidestep; set hard monthly spend caps on the Anthropic and OpenAI keys used by this site.
- The Stripe session id goes to Google Analytics as the transaction id (it is the key to a paid reading).
- No security headers (CSP, HSTS, frame-ancestors, nosniff).
- Home page phone load (LCP 4.6s, mostly web fonts); the /tell sample card is a 280KB PNG drawn on every load.
- Small UX: the buy button appears where the text box was, so a tap can land on it; the free retry keeps the old photo; tap targets on the voice and mic buttons; WhistlerBrew-style 404 page; Cloudflare email obfuscation rewrites the address in the guides' FAQ data.
- SEO polish: home title is only the brand name; guides share the generic sunset image without alt or size tags; legal pages have no share tags; Organization logo should be the new square icon; return-policy markup is CA-only.

## Traces left by the audit

GA4: about 5 test events (light_candle, start_tell, begin_checkout, want_printed_card). Stripe: one unpaid $14.99 Bridge checkout session plus earlier unpaid sessions from the live test. KV: about 5 feedback rows from probes (fake session ids starting cs_live_FAKE and cs_live_AUDITPROBE). Printed-card interest count: 1 from the audit.
