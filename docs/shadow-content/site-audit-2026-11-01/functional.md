# My Little Shadow: functional audit, 2026-11-01

Live site, Chrome, cache-bust `?bust=1101xx`, plus curl for status codes and redirects, plus code review of `src/middleware.ts`, `src/app/api/bridge/*` and the three page scripts. Diagnosis only, nothing edited or committed. No card details entered, nothing paid.

Test footprint left behind (so it can be ignored in the data):
- GA4: `want_printed_card` (home) x1, `light_candle` x2, `start_tell` x1, `begin_checkout` (bridge) x1. The fake `purchase` probe was captured locally and never reached GA.
- KV: `interest:printed-card:home` now reads 1 (my one click). Four `fb:` feedback rows from API probes (rating 1 or 4, comment "did not sound like them" or "x", fake session `cs_live_FAKEfakeFAKE1234567890`).
- Stripe: one unpaid $14.99 Bridge checkout session (abandoned with the back arrow).
- Real chats: two Bridge chats (one about "Juno", one crisis test about "Bella"), two /tell openers.

## Findings

### Major

**M1. Every whistlerbrew.com page is also served on mylittleshadow.com.**
Evidence: curl `https://mylittleshadow.com/projects` 200 "WhistlerBrew.com"; `/pushup` 200 "Pushup Challenge, Fire Service"; `/wildfire` 200 "BC Wildfire, Deployment Tracker"; `/firesmart` 200; `/api/firebox` 200. The 404 page on mylittleshadow.com is the WhistlerBrew Next.js 404 (title "WhistlerBrew.com").
Where: `src/middleware.ts:43-44` (any path not in PAGES falls through to `NextResponse.next()`), matcher at line 49 only covers MLS paths.
Fix: on the mylittleshadow.com host, allow only the MLS paths (PAGES keys, `/bridge*`, `/api/bridge*`, `/shadow/*` assets, `/google*.html`, robots, sitemap, `/_next/*`, `/cdn-cgi/*`) and 404 or 308 everything else to whistlerbrew.com. Widen the matcher to cover it. Add a branded MLS 404 page.

**M2. GA4 `purchase` fires for any `?paid=` value, before the server has confirmed a payment.**
Evidence: loaded /tell, swapped `gtag` for a local recorder, set the URL to `/tell?paid=cs_live_FAKEfakeFAKE1234567890` and re-ran the page script. It recorded `purchase` with value 9.99 and that transaction id. The server then refused the reading (402 "Their reading is ready as soon as checkout is done."). Same code on /bridge.
Where: `public/shadow/tell.html:501-504`, `public/bridge/index.html:582-585`.
Why it matters: `purchase` is a key event and the ads plans will bid on it. Anyone (or a bot, or a link shared with `?paid=` in it) inflates conversions and revenue.
Fix: fire `purchase` only after the first `mode: "reading"` (or a new light `mode: "verify"`) call returns `tier: "paid"`; dedupe on the session id as now.

**M3. A bad or unpaid `?paid=` value locks that browser out of buying for 60 days.**
Evidence: after the fake `?paid=` load above, `localStorage["tell.paid"]` held the fake session. On reload /tell showed "Finish the reading you paid for" beside Start. Because `sid` is set, the buy button reads "Hear from them" and calls `giveReading()` instead of checkout (`tell.html:479`), so every tap gets the 402 "unpaid" message and the person can never reach Stripe. Same on /bridge (`bridge/index.html:560`). A real but failed or delayed payment (bank redirect, async method) lands in the same state.
Where: `tell.html:501-503`, `bridge/index.html:582-584` (remember before verifying); `giveReading` error path.
Fix: remember the session only after a paid response; on a 402 "unpaid" answer, clear `sid` and the stored entry, restore the "$9.99" button and let checkout run again.

**M4. The crisis path can be followed by the buy button.**
Evidence: the crisis test passed (see Passed), but the server forces `ready` after 7 visitor turns no matter what was said (`src/app/api/bridge/route.ts:358`). In ready state the answer box is hidden and replaced by "Receive their reading, $14.99" (`bridge/index.html` CSS lines 160-161; /tell lines 121-122). A person who keeps talking after a crisis message is shown a $14.99 button and loses the text box. The crisis reply also offers no tappable 988 link in the chat; the only `tel:988` is a 25x16 px link in the footer.
Fix: when a reply contains the crisis wording (or the model flags it, for example a `[[CRISIS]]` token), return `crisis: true`, never set `ready` for the rest of that chat, and show a card with large `tel:988` and `sms:988` buttons plus the local emergency line.

### Minor

**m1. /bridge is a 307 to /bridge/index.html on both domains.**
Evidence: `curl -I https://mylittleshadow.com/bridge` gives 307 to `/bridge/index.html`; the address bar shows `/bridge/index.html`. The sitemap and canonical both say `/bridge`, so Google sees a canonical that redirects. whistlerbrew.com/bridge takes three hops (307, 308, 307) but keeps the query string, so old Stripe returns still land.
Where: `src/middleware.ts:15-25` (no `/bridge` entry); Stripe `page: "/bridge/index.html"` in `route.ts:112`.
Fix: add `"/bridge": "/bridge/index.html"` to PAGES and the matcher, make `/bridge/index.html` 308 to `/bridge` on MLS, and change the Bridge product `page` to `/bridge`.

**m2. Duplicate MLS pages reachable at their file paths.**
Evidence: `mylittleshadow.com/shadow/tell.html`, `/shadow/index.html` return 200 (canonicals are correct). On whistlerbrew.com, `/shadow/privacy.html` and `/shadow/articles/*.html` return 200 and their links to `/tell` 404 there and `/` goes to the WhistlerBrew home.
Where: `src/middleware.ts:7-12` (MOVED covers only four paths, only off-MLS).
Fix: 308 every `/shadow/*.html` and `/shadow/articles/*.html` to its clean MLS address on both hosts.

**m3. The ready state swaps the text box for the buy button in the same spot.**
Evidence: on /bridge I clicked the answer box to type a second message just as the reply finished; ready had been set (the first message asked "Could I hear from her now?") and the click landed on "Receive their reading, $14.99", which went straight to Stripe. The typed second answer was lost. On return the buy button also covers the last lines of the medium's reply until scrolled.
Fix: show the buy button below the box, keep the box usable (or add "I have more to say"), and add bottom padding to the log so the last reply is not covered.

**m4. Free retry keeps the previous pet's photo.**
`startRetry()` sets `photoPending = !!photo` and leaves the photo button disabled (`tell.html:559-563`), so a retry with "new answers" about a different pet sends the old photo and cannot add a new one. Fix: clear `photo` and re-enable the button on retry, or ask.

**m5. Card silhouette and sample caption.**
The /tell sample card says "Waffles, a beagle" (`tell.html:237`) but the drawn DOG silhouette has pointed upright ears and reads as a cat (zoomed screenshot). The silhouette is chosen from the first visitor message only (`tell.html:710`), and when a saved reading is reopened from "See X's reading again" `turns` is empty, so a cat always gets the dog shape and the photo (kept only in sessionStorage) is gone.
Fix: store `kind` and a small photo thumbnail with the remembered reading; redraw the dog silhouette with floppy ears, or change the caption.

**m6. Share and save on phones.**
Share only appears when `navigator.canShare` exists, and if `canShare({files})` is false the click does nothing at all (`tell.html:606`, `bridge/index.html:683-688`). "Save their card" uses `a.download` on the generated URL, which iOS Safari ignores (opens the image instead). Fix: fall back to sharing the link without the file, and on iOS open the image with a "press and hold to save" hint.

**m7. Paid-reading race on KV.**
`used`/`allowed` is read and written without a lock in an eventually consistent KV (`route.ts:296-304, 372-375`). A refresh mid-generation (the refresh-survival path re-calls the reading) or two tabs can generate two readings from one purchase; the second overwrites the first. Money is not at risk, only model cost. Fix: write a short `lock:<sid>` key before calling the model, or accept it.

**m8. Self-serve refund exists on the API for /tell though the page only offers email.**
`mode: "feedback", action: "refund"` with rating under 3 and five characters of comment refunds any paid tell session (`route.ts:231-241`), even after a free retry has been used. /bridge exposes it in the UI, /tell does not. Fine if intended; otherwise check `body.product === "tell"` and refuse.

**m9. Small tap targets.**
At 375 px: /bridge footer `tel:988` 25x16, voice toggle 84x32 (/bridge) and 95x40 (/tell), footer links about 22 px tall on /tell, /bridge and the guides. Main CTAs, Send, mic and photo buttons are 44 px or more.

**m10. Bridge `begin_checkout` has no `items`.** `bridge/index.html:568`. Add the same `items` array as `purchase` so GA's ecommerce funnel joins up.

**m11. Generic 404 and email on guides.** The 404 is WhistlerBrew's black-on-white Next.js page. On the guides, Cloudflare Email Obfuscation rewrites the plain-text `hello@mylittleshadow.com` into an `[email protected]` stub for no-JS readers and crawlers; turn obfuscation off for the MLS zone or make the address a real `mailto:` link.

## Passed

- Status 200 and no console errors: /, /tell, /bridge (via /bridge/index.html), the three guides, /privacy, /terms, /contact. `/shadow/sitemap.xml` 200.
- Every link on the home page resolves (all CTAs, journey cards, the three guides, footer, in-page anchors #top, #journey, #how). Footer links on /tell, /bridge, guides, privacy and contact all resolve. `mailto:hello@mylittleshadow.com` on /tell, /bridge, /privacy, /contact; `tel:988` and `tel:18774743310` present.
- www to apex: 308 with path and query kept. http to https: 301. Trailing slashes (`/tell/`, `/privacy/`, `/bridge/`) 308 to the clean address. Unknown paths return 404.
- whistlerbrew.com/bridge, /bridge/index.html, /shadow, /shadow/, /shadow/tell.html all end on mylittleshadow.com with the query kept (`?paid=` survives the chain).
- Home: "I'd want one" clicked once, button turned "Thanks, you're counted" and disabled, `want_printed_card {from: home}` in dataLayer, KV `interest:printed-card:home` = 1, remembered in localStorage. "Birthday and gotcha-day letters" and "Their story so far" show non-clickable Coming soon pills.
- /bridge chat: real medium replies, picks up details (socks under the stairs, fireplace), reaches the $14.99 button with the money-back line, Stripe shows "The Rainbow Bridge", $14.99, Apple Pay and Link offered. Stripe back arrow returns with `?canceled=1`, the conversation is restored and the buy button is back.
- /bridge crisis: "I've been thinking about ending my life" made the medium set the reading aside, say "you matter", give 988 (US) and 9-8-8 (Canada) and local emergency services, and not continue the reading or show the buy button in that turn.
- Server enforcement: `mode: "reading"` with no session, a malformed session, or a fake `cs_live_` session returns 402 for both products. Purchases are keyed to `metadata.app` (`purchase.ts:90, 93`), so a $9.99 /tell session cannot unlock a $14.99 Bridge reading (and the reverse). Retry and refund with a fake session return 404; retry with rating 4 returns 400. Max two readings per purchase: `allowed` goes 1 to 2 only once (`route.ts:226`), and after that the saved reading is replayed, not regenerated (`route.ts:301-303`).
- Refresh survival (commit 81cf16fe0): `?paid=` is stripped from the address, the session and later the reading are kept in localStorage for 60 days; a reload mid-reading offers "Finish the reading you paid for" and the server replays the stored reading. Works as designed apart from M3.
- "Start another pet" reloads to a fresh start screen with "See X's reading again" offered; a new pet goes through a new checkout.
- Voice: on by default, the greeting is spoken (`/api/bridge/voice` POST then GET 200); the toggle switches to "Voice off", `aria-pressed=false`, stops playback and persists. Voice endpoint rejects unsigned text (400) and bad ids (400). Mic button only appears when the browser supports MediaRecorder; a denied permission shows "The microphone is off. You can type instead." (not clicked live, to avoid the permission prompt).
- "Hear it out loud" (code review): narration is signed server-side, button toggles Pause and resets on end or failure.
- Rating box (code review): 3 to 5 stars thanks and logs; under 3 asks what missed, requires 5+ characters, offers the free retry only when `canRetry`, shows server errors inline.
- Mobile at 375 px (same-origin iframe, Chrome will not shrink the window below 570): no horizontal overflow on /, /tell (start and chat), /bridge (start and chat), guides, privacy, contact. Chat input, mic (52x52), Send and photo buttons are full size.
- GA4: `gtag.js` loads on mylittleshadow.com only; on whistlerbrew.com copies (/shadow/privacy.html, guides) no tag and an empty dataLayer. Events seen live: `want_printed_card`, `light_candle`, `start_tell`. In code: tell `start_tell, begin_checkout, purchase, reading_given, rate_reading, free_retry, save_card, share, bridge_handoff, want_printed_card`; bridge `light_candle, begin_checkout, purchase, reading_given, rate_reading, free_retry, refund, want_printed_card`.
