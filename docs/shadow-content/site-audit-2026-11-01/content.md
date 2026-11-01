# My Little Shadow: customer-facing content audit (2026-11-01)

Scope: every string a customer reads or hears on mylittleshadow.com. Files read: `public/shadow/index.html`, `tell.html`, `privacy.html`, `terms.html`, `contact.html`, `public/shadow/articles/*.html`, `public/bridge/index.html`, the live prompts and Stripe product strings in `src/app/api/bridge/route.ts`, retention code in `purchase.ts`, `shared.ts`, `voice/route.ts`, plus `.claude/agents/hazel.md`, `docs/project-log/decisions.md` and `current-status.md`. Code read, no browser used. Diagnosis only: nothing edited.

Severity: **Critical** = breaks an owner rule or makes a false claim to customers today. **Major** = contradiction, inaccurate legal/privacy text, or a risk that needs Brew's call. **Minor** = polish, consistency, accessibility.

Suggested wording is marked **for Hazel** and is a starting point only, not final copy. Anything touching price, guarantee, policy or business identity is Brew's decision first.

Clean checks (no finding): zero em-dashes or en-dashes in any site file or prompt; zero mentions of Carnivore Weekly on any My Little Shadow page; prices are $9.99 (tell) and $14.99 (Bridge) everywhere they appear; 988 and 9-8-8 are correct for Canada and the US; no invented reviews, ratings, customer counts or statistics anywhere; both reading prompts forbid em-dashes, medical advice and invented hard facts, and both have crisis step-out rules.

---

## Cross-site findings (fix once, touches many pages)

### X1. Critical: Privacy promise about feedback is false in the code
- `public/shadow/privacy.html:66`: "Your reading is included with your feedback only if you leave that box ticked."
- What the code does: a 3, 4 or 5 star rating sends the full reading with no box shown at all (`public/shadow/tell.html:669` and `public/bridge/index.html:749` call the rating with `withReading = true`). The box only appears for 1 or 2 stars, and it is pre-ticked (`tell.html:643`, `bridge/index.html:721`).
- Feedback entries (`fb:` keys) are written with no expiry (`route.ts:214`, no `expirationTtl`), and carry the Stripe session id (`route.ts:211`), which links the reading to a purchase and its receipt email. Privacy gives no retention period for feedback.
- Also contradicts `privacy.html:48` "We don't keep chat transcripts" in spirit: a Bridge reading can contain the person's grief details and names, kept indefinitely.
- Fix is Brew's call (code or copy). **For Hazel**, if the code stays as is: "When you rate a reading, we keep your stars and the reading itself so we can improve. If you rate it under 3, you can choose to leave the reading out. We keep feedback for [period]. To have it deleted, email hello@mylittleshadow.com."

### X2. Critical: the free retry is still promoted outside Terms
Owner rule: the retry is only the in-reading fallback for under-3 ratings, described in Terms as the mechanism, never sold. The /tell footer was fixed on 2026-11-01; these were not:
- `public/bridge/index.html:318`: "Our promise: if a reading doesn't feel like them, try again free from your reading, or email ... for a full refund"
- `public/shadow/contact.html:54`: "Rate it under 3 stars and tell us in a few words what missed, and you can try again with new answers, free."
- `public/shadow/privacy.html:56`: "That way you can reload it, use your free retry, or ask us for a refund."
- Minor, in Terms itself: `terms.html:69` "our guarantee (a free retry or a full refund) is there for you" restates the retry as a selling point in the liability section.
- **For Hazel** (Bridge footer, mirroring the fixed /tell footer): "Our promise: if a reading isn't right for you, email hello@mylittleshadow.com within 30 days for a full refund, handled within 24 hours."
- **For Hazel** (Contact): "If a reading didn't feel right, email us within 30 days of purchase and we'll refund you in full, usually within 24 hours."
- **For Hazel** (Privacy): "That way you can come back to it, and we can check your purchase if you ask for a refund."
- **For Hazel** (Terms liability): "If a paid reading didn't feel right, see Our guarantee above."

### X3. Major: money-back wording differs on every surface, and is narrower than the real policy
Real policy (decisions 2026-10-31): any refund request by email within 30 days is honoured, even after a retry. The site says six different things:
| Where | Wording |
|---|---|
| `index.html:301` | "$14.99, with a money-back guarantee" |
| `index.html:311` | "Money-back guarantee" (first item of the promise strip) |
| `tell.html:242`, `tell.html:266` | "if it doesn't sound like them, you get your money back" |
| `tell.html:197` (JSON-LD), `route.ts:141` (Stripe checkout description) | "Money back if it doesn't sound like them." |
| `tell.html:275`, all three guides (body) | "if a reading isn't right for you, email ... within 30 days for a full refund" |
| guides' CTA box (`questions-to-ask-your-dog.html:166`, `what-is-my-cat-thinking.html:163`, `what-would-my-dog-say.html:163`) | "$9.99, and your money back if it doesn't sound like them." |
| `bridge/index.html:308`, `bridge/index.html:251` (JSON-LD), `route.ts:111` (Stripe) | "If it doesn't feel like them, (you get) your money back" |
| `terms.html:62-63` | Refund framed as the step after the retry: "If you'd still rather have your money back..." |
- Problems: the conditional ("if it doesn't sound like them") is narrower than "any request honoured"; Terms reads as if the retry must come first; home leads the night promise strip with the guarantee, which pushes it past "secondary trust line".
- **For Hazel**, one line used everywhere it appears: "Not right for you? Email us within 30 days for a full refund." Terms keeps the mechanism: "Any refund requested by email within 30 days of purchase is honoured, whether or not you've used the in-reading retry." Consider replacing the promise strip item with something non-monetary or moving it last.

### X4. Major: "Photos never stored" is absolute; Privacy says the AI companies may keep content
- `index.html:314` "Photos never stored"; `tell.html:274` and `bridge/index.html:316` "Your photo and voice are never stored"; guide FAQ `what-is-my-cat-thinking.html:103` "A photo is optional and never stored."
- `privacy.html:62`: Anthropic and OpenAI "may keep it for a limited time for safety and abuse monitoring." The photo is also held in the browser's sessionStorage during checkout (`tell.html:483`, `bridge/index.html:564`), which Privacy does not mention.
- **For Hazel**: "We never keep your photo" (strip), and in footers "We don't keep your photo or voice; feedback you choose to send is kept so we can improve."

### X5. Major: AI disclosure on the living-pet product
- `route.ts:61`: the /tell host is told "Never mention being an AI unless sincerely asked." The medium-act exception (decision 2026-10-30) covers /bridge only; on /tell there is no act to protect.
- The /tell intro (`tell.html:236-247`) and the home "How it works" (`index.html:115-146`) never say AI; it appears only in footers. The guides do say "a playful, AI-written voice" (good).
- The host and pet voices are OpenAI text-to-speech with no "AI voice" label (OpenAI's usage policies ask that end users be told TTS voices are AI-generated). The footer "An AI experience" may or may not be enough; Brew's call.
- **For Hazel**: add to /tell under the Start button: "A playful AI host asks the questions, and an AI writes their reply from what you share." Prompt change (Brew to approve): "You are an AI host. If asked, say so plainly and cheerfully, then carry on."

### X6. Major: Hazel's brief is out of date and will reproduce the problems above
- `.claude/agents/hazel.md:62`: "Living-pet reading ... are **Coming soon** until Brew prices and launches them" (tell launched 2026-10-31 at $9.99 USD; the price is not in her fixed facts at all).
- `hazel.md:58`: "Steer people to the retry" with no "never promote it outside the reading or Terms".
- `hazel.md:59`: "card statements read with RAINBOW BRIDGE" (no LITTLE SHADOW, and see T2 on truncation).
- `hazel.md:61`: "Photos and voice recordings are never stored" (see X4).
- `hazel.md:44`: candlelight voice allowed on "the dusk section that leads to it", which conflicts with the owner rule that the medium act lives on /bridge only (see H5).
- `hazel.md:63`: required footer line "An AI experience for comfort, celebration and entertainment." Pages use three different lines (see X8).
- Not customer-facing, but every future draft inherits it. Update before Hazel's next job.

### X7. Minor: currency missing at some prices
USD shown on home and /tell intro, but not at: `index.html:301` "$14.99", `tell.html:265` "Hear from them, $9.99", `bridge/index.html:307` "Receive their reading, $14.99", guide CTA boxes "$9.99,". Canadian visitors will assume CAD. **For Hazel**: add "USD" at least once near each buy button.

### X8. Minor: footer AI line varies
- `index.html:329`, privacy/terms/contact: "An AI experience for comfort, celebration and entertainment."
- `tell.html:274`: "An AI experience for fun and celebration."
- `bridge/index.html:316`: "An AI experience for comfort and reflection, offered for entertainment."
- Per-page variation is defensible (daylight vs candlelight), but Hazel's brief says one required line. Brew to choose; then align brief and pages.

### X9. Minor: "reading" vs "message"
Guides call the paid product both: "The chat is free, and the message is $9.99 USD" (`what-is-my-cat-thinking.html:95,158`, `what-would-my-dog-say.html:95,158`) next to "The reading is $9.99 USD" on the same page. **For Hazel**: "reading" everywhere a price appears.

### X10. Minor: Canadian spelling
Mostly Canadian already (favourite, colouring, counselling, honour, neighbour, grey). Outlier: "recognise" (`what-would-my-dog-say.html:87,125,157`). Canadian style is "recognize". Also "3am" (`index.html:163`) vs "3 a.m." (cat guide). Pick one.

---

## Home page (`public/shadow/index.html`)

### H1. Major: living-pet overclaims contradict "not mind reading"
- `index.html:88` "get a message in their voice that sounds exactly like them."
- `index.html:142` "A message in their voice, funny and a little too accurate"
- `index.html:184` "a funny, uncannily specific message from them"
- `/tell` footer (`tell.html:274`) says "a playful voice built from what you tell us, not mind reading." "Exactly", "too accurate" and "uncannily" all imply insight the product doesn't have, on the living-pet product where psychic claims are banned.
- **For Hazel**: line 88 "...and get a funny, loving message in their voice, built from everything you tell us." Line 142 "A message in their voice, funny and full of the little things you told us." Line 184 "...and get a funny, very specific message in their voice, made from your answers".

### H2. Major: headline promises hidden communication
- `index.html:87` h1, `index.html:7` and `:9` meta/OG, and `tell.html:7,9` meta/OG: "Hear what your little shadow has been trying to tell you." CTA `index.html:90` and `tell.html:265` "Hear from them".
- Read literally, it says the pet is communicating something we receive. It's the brand's hook, so this is Brew's call, but it sits uneasily next to "not mind reading".
- **For Hazel** (options): "Give your little shadow the microphone." / "What would your little shadow say if they could?" CTA: "Let them talk" or "Start their reading".

### H5. Critical: medium act on the home page
- `index.html:298` "Light a candle, and a gentle medium helps you hear from them."
- `index.html:299` the pet's voice: "I'm still beside you. When the sun is low, look down at your shadow and leave a little room." (also an unlabelled sample)
- Owner rule (decision 2026-10-31): "Medium act stays on the Bridge only." Hazel's brief (`hazel.md:44`) allows candlelight on the home dusk section, so the two disagree. Brew to rule.
- **For Hazel**, if the rule stands: "For pets who have passed. Light a candle and hear a gentle letter in their voice." Label the quote "From a sample reading" or drop it.

### H6. Minor: Bridge and grief on likely ad landing pages
Ads are parked, but home (`index.html:7` meta "and The Rainbow Bridge for after", `:278-304` night section) and /tell (`tell.html:276` footer link) both carry Bridge content. If ads restart and land on these, the "no Rainbow Bridge or grief in paid campaigns" rule needs a grief-free landing variant. Flag for the ads plan, no copy change now.

### H7. Minor: sample lines could read as real customers
- `index.html:151-152` "Sample lines" / "Overheard from the couch", captions "Biscuit, 4, beagle mix", "Olive, 7, tabby", "Mango, 2, orange cat, no regrets" (`:156,160,164`). Card "A message from Biscuit" (`:198`), letter "Love, Pepper" (`:214`).
- Labelled "Sample lines", so not a breach, but ages and breeds make them look like real pets. **For Hazel**: "Overheard from the couch (sample lines)" or caption "Biscuit, 4, beagle mix (sample)".

### H8. Minor: other home copy
- `index.html:134` "Any photo works." /tell says "Optional." **For Hazel**: "Optional. Any photo works. We use it for your reading and your card, then let it go."
- `index.html:243` "while they're still curled up beside you" on a daylight section brushes mortality. Hazel's rule: a happy visitor is never ambushed by grief. **For Hazel**: "...into a keepsake you can keep beside you."
- `index.html:229,244,263` three "Coming soon" items; only printed cards has an "I'd want one" button. Consistent with Terms (`terms.html:55`). Optional: add the same interest button to the other two.
- `index.html:336` footer link text "Questions to ask your pet" goes to a page titled "Questions to ask your dog" (`questions-to-ask-your-dog.html:6`). Align.
- `index.html:109` "Move your cursor or tap. They'll follow." is read by screen readers but describes an `aria-hidden` animation. Mark it `aria-hidden` too.
- `index.html:300,337` link to `/bridge/index.html` while every other page links `/bridge` (canonical). Use `/bridge`.

---

## What they'd tell you (`public/shadow/tell.html`)

### T1. Major: covered above
H1/H2 (meta and "Hear from them"), X3 (guarantee wording `:242,266,197,275`), X4 (`:274`), X5 (no AI line in the intro), X7 (`:265`).

### T3. Minor: structured data return policy
`tell.html:209-215` (and `bridge/index.html:263-269`): `MerchantReturnPolicy` with `applicableCountry: "CA"` and `FreeReturn`. This is a digital reading with a refund, not a return, and most buyers are US. Could show wrong info in Google. Brew/tech call: drop it or describe a refund policy for US and CA.

### T4. Minor: accessibility
- Star radios `tell.html:639` (`bridge/index.html:717`): label "1 of 5". **For Hazel**: "1 star", "2 stars"...
- `tell.html:323` `aria-label="Thinking"` on a plain `<p>` is ignored by most screen readers; the dots are read as "dot dot dot". Use visually hidden text "Thinking".
- Photo bubble alt "Your photo" (`tell.html:315`) is fine. Sample card alt (`:232`) is good.

### T5. Minor: grief hand-off tone check
Host prompt `route.ts:59` hands off to the Bridge "on this same site" and the page adds a "Visit The Rainbow Bridge" button (`tell.html:310`). Fine organically and approved (decision 2026-10-31). Note only: the button appears whenever a reply mentions "rainbow bridge", including a joke.

---

## The Rainbow Bridge (`public/bridge/index.html`)

### B1. Critical: free retry in the footer
See X2 (`:318`).

### B2. Major: covered above
X3 (`:251,308`, Stripe `route.ts:111`), X4 (`:316`), X7 (`:307`).

### B3. Minor: crisis resources
- `bridge/index.html:317`: ASPCA Pet Loss Hotline 1-877-474-3310 and "call or text 988 in Canada or the US". 988 is correct for both. The ASPCA number matches the published hotline, but it could not be confirmed as still staffed without a browser. Worth one check by phone or on aspca.org.
- The Bridge medium prompt (`route.ts:32`) covers crisis but not heavy-but-not-crisis grief. **For Hazel** (prompt, optional): "If grief sounds heavy, you may gently mention that the ASPCA Pet Loss Hotline is listed at the bottom of the page."
- Terms and Contact crisis sections (`terms.html:50`, `contact.html:56`) list 988 but not the pet-loss line. Optional to add.

### B4. Minor: tone of system messages
- `route.ts:132` unpaid message: "The candle is waiting for your offering." Calls the payment an offering in a grief setting; brushes Hazel's "never salesy" and "no 'your pet is waiting'" rules. **For Hazel**: "Their reading will be ready once checkout is complete."
- `bridge/index.html:744` "Your refund is on its way..." is unreachable (no refund button) but would show if the refund action were wired back. Leave or remove; not customer-visible today.
- `bridge/index.html:798`: the keepsake card prints "whistlerbrew.com/bridge" on any host that isn't mylittleshadow.com. Production redirects, so not customer-visible; fine.

---

## Privacy (`public/shadow/privacy.html`)

### P1. Critical: feedback claim. See X1 (`:66`).

### P2. Major: "you can reload it" overclaims
- `privacy.html:56` "That way you can reload it" and `:49` "so you can come back to it".
- Reality: the reading comes back only on the same browser, because the session id lives in that device's localStorage for 60 days (`tell.html:290`, `bridge/index.html:332`). New phone, cleared storage or private window: no way back in, and the Stripe return URL is wiped from the address bar (`tell.html:496`). Support can't send it either; nothing emails the reading.
- **For Hazel**: "If you buy a reading, its finished text is kept for up to 60 days. On the same device and browser you can open it again; if you lose it, email us and we'll do our best to help."
- Related: the 60 days restart whenever the purchase record is saved again (`purchase.ts:80`, e.g. after a retry), so "up to 60 days" can run a little longer than 60 days from purchase. Minor.

### P3. Major: browser storage list is incomplete
- `privacy.html:72` lists voice on/off, the printed-card tap, and "your conversation while you go through checkout".
- Missing: the photo is kept with the conversation during checkout (sessionStorage), and the paid session id plus the full reading are kept in localStorage for 60 days.
- **For Hazel**: "...your conversation and photo while you go through checkout, and, if you buy a reading, the reading itself for 60 days so you can open it again on this device."

### P4. Minor: smaller accuracy points
- `privacy.html:60` "When the reading is spoken aloud": the host's and medium's chat replies are spoken too. **For Hazel**: "When the host, the medium or the reading speaks aloud..." The 10 minute hold matches the code (`voice/route.ts:34`).
- `privacy.html:69` "counters expire after about a day": matches (26 hours, `shared.ts:30`).
- `privacy.html:71` GA list says "a refund" (no refund event fires from the UI now) and omits "Start" on /tell, the Bridge hand-off and the printed-card tap (`want_printed_card` is a GA event as well as the anonymous counter in `:67`). Align the list.
- `privacy.html:64` "Stripe sends your receipt." True, but receipts currently carry the shared account's branding (current-status, Bridge payments). Not a text fix; part of T2's separate-Stripe-account decision.
- `privacy.html:76` "based mainly in the United States and Canada": Cloudflare serves from edge locations worldwide. **For Hazel**: "mainly in the United States and Canada, and Cloudflare may serve pages from elsewhere."
- No cookie notice or consent choice for GA. Fine for most Canadian and US visitors under implied consent; flag only if EU/UK traffic grows.
- "Last updated: October 31, 2026" (`:42`). Bump when P1 to P4 land.

---

## Terms (`public/shadow/terms.html`)

### T2. Major: statement descriptor wording is incomplete and probably truncated
- `terms.html:58`: "Charges appear on your card statement with LITTLE SHADOW (What they'd tell you) or RAINBOW BRIDGE (The Rainbow Bridge) in the description."
- The account prefix is CARNIVOREC (decisions 2026-10-31), so customers see "CARNIVOREC* ..." with no explanation, which is the dispute risk Brew already noted. The site can't name CW (owner rule), so text alone can't fully fix it.
- Card networks cap the full descriptor at 22 characters. "CARNIVOREC* LITTLE SHADOW" is 25 and "CARNIVOREC* RAINBOW BRIDGE" is 26, so Stripe likely shortens the suffix (for example "LITTLE SHA" or "RAINBOW BR"). current-status already lists the suffix as untested. Check one real statement before trusting the Terms line.
- Real fix is Brew's: the separate Stripe account in the 2026-10-31 decision. **For Hazel**, interim: "The charge appears on your card statement with a short descriptor that includes LITTLE SHADOW or RAINBOW BRIDGE (it may be shortened by your bank). If you don't recognise a charge, email us first and we'll sort it out."

### T6. Major: guarantee framing. See X3 (`:62-63`) and X2 (`:69`).
- **For Hazel** (Our guarantee, mechanism only): "Any paid reading can be refunded in full: email hello@mylittleshadow.com within 30 days of purchase and we'll handle it within 24 hours. Refunds go back to the card you paid with and can take 5 to 10 days. Inside the reading, a rating under 3 stars with a few words about what missed also offers one retry with new answers, at no charge. Each purchase allows at most two readings."

### T7. Major: business identity (also Contact)
- `terms.html:45` and `privacy.html:45`: "a small independent project based in British Columbia, Canada." `terms.html:69` "My Little Shadow and its owner".
- No legal name, business address or phone anywhere on the site. BC's consumer protection law for distance sales generally expects the seller's name, business address and contact details to be disclosed before purchase; missing disclosure can give buyers extra cancellation rights. Not legal advice; Brew to decide what identity to publish (and it must not reveal the CW link).
- **For Hazel**, once Brew supplies details: "My Little Shadow is operated by [legal name], [city], British Columbia, Canada."

### T8. Minor
- `terms.html:42` "Last updated: October 31, 2026 (What they'd tell you added)": the parenthetical reads like a changelog. **For Hazel**: "Last updated: [date]".
- No line on /tell saying it is not psychic or a real message from the pet, or on /bridge that it is not proven contact. `terms.html:47` ("an AI experience, made for comfort, celebration and entertainment") is close. **For Hazel**, optional: "Readings are imaginative pieces written by AI from what you share. They are not a message from your pet or a psychic reading."
- `terms.html:50` and `contact.html:56`: "call or text 9-8-8" then "call or text 988". Both forms are correct; consistent format reads cleaner.

---

## Contact (`public/shadow/contact.html`)

- **Critical**: `contact.html:54` promotes the free retry. See X2.
- **Major**: no business identity. See T7.
- Minor: `contact.html:52` "We reply within 24 hours." matches the decision; fine. The page has no crisis pet-loss line; 988 present (`:56`). Optional ASPCA line, see B3.

---

## Guides (`public/shadow/articles/`)

### G1. Major: guarantee wording differs inside each page
Body says "If it isn't right for you, email ... within 30 days for a full refund" (`questions-to-ask-your-dog.html:157`, `what-is-my-cat-thinking.html:154`, `what-would-my-dog-say.html:154`, plus FAQ JSON-LD); the CTA box at the bottom says "your money back if it doesn't sound like them" (`:166` / `:163` / `:163`). See X3 for one line to use in both.

### G2. Minor: general pet-behaviour and vet lines
- Hedged and generic ("usually", "often", "check with a vet"), so not veterinary advice, and the vet nudges are responsible. Closest to the line: purring "cats can also purr when they're stressed or unwell. If your cat stops eating, hides much more than usual... check with a vet" (`what-is-my-cat-thinking.html:146`) and "If your pet seems sore, stops eating, or suddenly acts very differently, check with a vet" (`questions-to-ask-your-dog.html:151`). Keep them hedged; no change needed unless Brew wants zero health content.
- No sources cited for behaviour claims. Acceptable for this tone; avoid adding numbers or studies without a source.

### G3. Minor: samples and naming
- Sample readings (Clementine, Duchess, Waffles) are labelled "sample reading" in bold every time (`questions-to-ask-your-dog.html:148,152`, `what-is-my-cat-thinking.html:150,152`, `what-would-my-dog-say.html:150,152`). Good, no invented-testimonial issue.
- `questions-to-ask-your-dog.html:6` title "Questions to ask your dog if they could talk" vs h1 "(or cat)" (`:117`) vs footer link "Questions to ask your pet". Align on one.
- Plain-text email in "email hello@mylittleshadow.com" (`:157`, `:154`, `:154`) is not a link. Make it a mailto link.
- Link text "mylittleshadow.com/tell" (`:156`, `:149`, `:149`) is a URL as link text; screen readers spell it out. **For Hazel**: "the What they'd tell you page".
- See X9 ("message" vs "reading") and X10 ("recognise").

---

## Live prompts and Stripe strings (`src/app/api/bridge/route.ts`)

- **Major**: tell host hides AI unless asked (`route.ts:61`). See X5.
- **Major**: Stripe checkout descriptions use the conditional guarantee (`route.ts:111` Bridge, `route.ts:141` tell). See X3. **For Hazel**: Bridge "A personal reading and keepsake card. Not right for you? Full refund by email within 30 days." Tell "A reading in your pet's voice, plus a card made for sharing. Not right for you? Full refund by email within 30 days."
- Minor: `route.ts:66` "so their pet's voice can come through" has a faint medium flavour in the living-pet prompt. **For Hazel**: "so you can write their pet's voice".
- Minor: `route.ts:132` "The candle is waiting for your offering." See B4.
- Good: `route.ts:55` explicitly bans death, spirits, psychic powers and mind reading on /tell; `route.ts:56` and `:85` keep health questions for the vet; `route.ts:86` stops the pet stating unknowable things as fact; `route.ts:29-30` keep the medium off medical and end-of-life verdicts; both prompts ban em-dashes and have crisis steps with correct numbers. Bridge medium hiding AI (`route.ts:31`) is consistent with the 2026-10-30 decision.

---

## Summary for Brew (decisions needed before Hazel drafts)
1. Feedback data: keep auto-including readings on 3+ star ratings and keep them forever, or change the code; Privacy must match either way (X1).
2. One guarantee line for all pages, Stripe and Terms (X3, T6).
3. Medium act on the home page's night section: allowed or not (H5, Hazel brief conflict).
4. Whether the /tell host should say up front that it's AI (X5).
5. Business identity to publish on Terms and Contact (T7).
6. Statement descriptor: check a real statement now; separate Stripe account later (T2).
