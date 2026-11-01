# Final red team: the two green-team plans for "What they'd tell you"

Date: 2026-11-01
Reviewed: `ads-review/2026-11-01-green-team.md` (cloud session, "Meta first, Search held"; called **Cloud** below) and `ads-review/2026-11-01-green-team-hazel.md` (Hazel, "Search plus Meta"; called **Hazel**), both re-read from disk after the merge-marker fix (zero conflict markers in either). Checked against `public/shadow/tell.html`, the three articles, `index.html`, `terms.html`, `privacy.html`, `contact.html`, `src/middleware.ts`, `src/app/api/bridge/purchase.ts`, the samples in `2026-10-31-what-theyd-tell-you-prompts.md`, the live test `live-test-2026-11-01/README.md` and the first red team's Top 10.
Mode: diagnosis only. No file other than this one was touched.

**Verdict: launch after fixes.** Not ready to spend today. Both plans' ad copy is close (every asset is within limits, no em dashes, no free retry in any ad), but none of the landing-page blockers either plan depends on is live, both plans send paid sitelink traffic to pages titled "translated" with a "psychic reading" FAQ, and Cloud's Meta copy promises to reveal whether your cat "actually loves you".

---

## 0. Mechanical checks (all passed)

- **Lengths.** Every headline, description, sitelink text and line, callout, snippet value and display path in both files was re-measured with Python `len()` from the saved files (script in the scratchpad, not the repo). All 30 RSA headlines and 8 descriptions in each plan match their stated counts and sit within 30 and 90. Hazel's sitelinks (25/35), callouts (25), snippets (25) and display paths (15) all pass. Cloud's sitelinks pass (longest line 34). Cloud's display paths `dog` / `message` pass.
- **Em dashes and en dashes:** zero in both files.
- **Keyword versus negative conflicts:** none. Every keyword (Hazel 26, Cloud 12) was tested token by token against every campaign negative (Hazel 113, Cloud 76) and against the ad-group animal negatives. No negative blocks a target keyword.
- **Final URLs exist.** `/tell`, `/what-would-my-dog-say`, `/what-is-my-cat-thinking`, `/questions-to-ask-your-dog` are all rewritten by `src/middleware.ts` (PAGES map and matcher) and the target files exist. Query strings survive the rewrite. What does **not** exist yet: the `?pet=` behaviour, `#sample`, `#how`, `#cat` (see M5).
- **Line references.** Hazel's citations into `tell.html` (482 purchase, 420 start_tell, 321 voiceOn, 575 reload, 666 card size, 590 card_share) and Cloud's (256, 265, 266, privacy 71) are accurate.

---

## 1. Critical

### C1. Both plans: paid sitelinks land on pages that claim "translation" and raise "psychic reading" (owner rule 3)

Evidence (live today):
- `articles/what-would-my-dog-say.html` line 6: `<title>What would my dog say? 9 dog habits, translated</title>`; line 119: "the everyday things dogs do, translated into what they'd probably say"; line 157: "which is why a translation helps"; line 158: "Is What they'd tell you a psychic reading?"
- `articles/what-is-my-cat-thinking.html` line 117: `<h1>What is my cat thinking? A translation guide</h1>`; FAQ "Can What they'd tell you read my cat's mind?"
- All three articles: "Start their reading", "you get your money back" with no condition, "not mind reading".

Hazel sitelinks "Dog habits, explained" and "Cat habits, explained" point at these pages, and Hazel's own launch gate ("1 to 4, 7, 8, 11 to 13 and 16") **omits blocker 15**, the retitle, so the plan as written can launch with them live. Even blocker 15 only retitles; it does not remove the psychic FAQ, "translation helps" or the defensive "not mind reading" lines. Cloud's sitelinks "What would my dog say?" and "What is my cat thinking?" go to the same pages and are gated only on nice-to-have 2, which fixes the money-back wording and nothing else. Cloud's sitelink text "What is my cat thinking?" is itself the "what they really think" framing, and lands on "A translation guide".

Fix: no article sitelink until each article is retitled ("explained", not "translated"), the H1 "A translation guide" and "which is why a translation helps" are rewritten, the psychic and mind-reading FAQs are removed (not reworded into negations), "reading" becomes "message", and the price line uses the conditioned refund wording. Rename Cloud's sitelink text to "Cat habits, explained". Add blocker 15 (expanded as above) to Hazel's gate.

### C2. Cloud Meta concepts 2 and 3 promise to reveal whether the pet loves you (owner rule 3)

Evidence: Concept 2 primary text, "Ask your cat the things you've always wondered. Why the rings end up on the floor. Whether she actually loves you. Tell our host about her, and she answers in first person." Concept 3 leads with "You asked: 'Do you actually love me?'" and is headlined "Ask your pet 3 questions".

This is the "what they really think" claim the owner banned: it sells access to the pet's true feelings. The coy sample answer does not undo the promise in the line before it.

Fix: cut "Whether she actually loves you." from concept 2 (for example: "Why the rings end up on the floor. Why the sink is hers."). Rebuild concept 3 on the rings question or Clementine's charger answer, not "Do you actually love me?".

### C3. Neither plan can launch today: the page blockers both plans depend on are not live

Evidence (`tell.html` as of today): H1 still "Let them finally get a word in." (line 227); no sample, card or image in the intro; no code reads `pet=` (grep finds none); no `id="sample"` or `id="how"`; price line still "Their reading is $9.99 USD, and if it doesn't sound like them, you get your money back." (line 232); footer still "try again free from your reading" (line 265) and still links `/bridge` (line 266); `voiceOn = true` (line 321). No Meta pixel, no Google Ads tag, no `chat_started` or `chat_ready` event. Live test: "No payment made."

Hazel's section G and Cloud's header both read as though the red team's Top 10 is answered. In the plans it largely is; on the site it is not (status table in section 4). Every Hazel RSA, sitelink and Meta ad, and every Cloud Meta ad, assumes the keyword-echo hero and the sample card exist.

Fix: treat the launch gate at the end as the go/no-go, checked on the live URL with a cache-bust, not on the plan.

---

## 2. Major

### M1. Both plans: "AI" is not guaranteed in a served Search ad

Evidence: Hazel says "AI is said plainly in a headline and a description", but nothing is pinned. AI appears in H9 and D3 only, so most H1/H2/D1/D2 combinations say nothing about AI, and callouts are not always shown. Cloud pins four headlines to position 1, only one of which (`Your dog's funny AI message`) says AI, and **none of Cloud's four descriptions** says AI; AI otherwise appears only in unpinned H12.

Fix: make AI appear in every description or pin an AI description. Measured options: `AI sample, Waffles the beagle: "The microwave beeps, I answer. That's just good manners."` (89) and `AI sample, Duchess: "I don't need anyone. I just need you at the sink every morning."` (85). Or pin Hazel D3 `Made with AI from your stories: ...` (86) to description position 1.

### M2. Cloud: the refund gets a full description slot and three lines on the page (owner rule 2, red team #6)

Evidence: Cloud D4, "Full refund if you email us within 30 days of buying. Start with your dog's name." It is unpinned, so it serves as one of the two descriptions in a large share of impressions. Page Must 3 adds "Money-back guarantee" three times on `/tell`: under Start, under "Hear from them, $9.99", and in the footer.

That is not "at most a secondary trust line". It repeats the defensive tone the first red team flagged.

Fix: drop Cloud D4. Use Hazel's single callout `Refund by email, 30 days` (24). On the page keep one refund line (footer, Hazel blocker 13 wording). The promise line at the buy button can stay only if the footer line goes.

### M3. Cloud: "Your dog roasts you, kindly" is pinned to position 1

Evidence: Cloud H3 and the cat H3 are pinned to position 1, so they lead about a quarter of all ads. Hazel held back "dog roast" because "The output is loving, not a roast; expectation mismatch". The prompts doc never mentions roasting, and the sample output is affectionate.

Fix: replace it with `Your dog's side of the story` (28) or `What would your dog say?` (24).

### M4. "letter from my dog" and "message from my dog" carry grief and pet-psychic intent (owner rule 4)

Evidence: both plans bid on [letter from my dog] or [message from my dog] (Hazel exact; Cloud phrase from day one). These phrases are heavily used for pet-loss poems ("a letter from your dog in heaven") and pet-medium "messages from the other side". Exact match cannot tell a grieving searcher from a curious one. A searcher typing exactly "letter from my dog" a week after a loss gets "A funny message from your dog". Both negative lists miss `spirit`, `crossed`, `angel`, `beyond`, `"sign from"` and `"other side"`, and Cloud also misses `"passed away"`, `dying` and `afterlife`.

Fix: launch Search on [what would my dog say] / [what would my cat say] variants only. Add the missing negatives to both lists. Add "letter from / message from" only after the first two search-term reviews show no grief queries on the closest terms.

### M5. Sitelinks and URLs that point at things that do not exist

Evidence: Hazel `/tell?pet=dog#sample`, `/tell?pet=dog#how`, `/tell?pet=cat#sample`, `/tell?pet=cat#how`; the `#cat` anchor on `/questions-to-ask-your-dog` (its `<h2>Questions to ask your cat</h2>` at line 132 has no id); Cloud `/tell#sample`. Cloud's `#sample` will be a closed `<details>`. Fragment navigation into a closed details element does not open it in every browser (not verified on iOS Safari), so the sitelink can land on a collapsed line. Two of Hazel's four sitelinks point at the ad's own landing page with only a fragment changed. Google may treat these as duplicate sitelink destinations (not verified).

Fix: build the ids before the sitelinks go in. Open `#sample` from JS on hash. Prefer one same-page sitelink per group. Cloud's sitelinks are campaign-level, so cat searchers see "Questions to ask your dog" and "What would my dog say?": move them to ad-group level as Hazel does.

### M6. Hazel's Search bid cap and kill rules contradict each other

Evidence: "Manual CPC with a cap of $0.27" against Hazel's own benchmark "about $3.97 to $4.06 per click". At roughly one fifteenth of the going rate, the probe will most likely get almost no impressions, so it learns nothing. Kill rule 2 ("average CPC sits above $0.45 ... pause") can never fire under a $0.27 cap. Kill rule 1 pauses each Meta ad "at $18 spend ... with zero purchases" while the same plan has Meta optimising for `chat_started`: about 18 clicks per ad at Meta's benchmark, which is noise, and would likely kill every ad before the stated learning goal. Kill rule 3 uses `chat_started`, an event that does not exist yet. Kill rule 4 ("half of Brew's test budget") has no budget to halve.

Fix: adopt Cloud's section 6 rules (stage checks at about 1,000 impressions, $50 and $100 on a $100 Meta round; Search later at a $2 cap and $60 total). If Hazel's Search probe is kept, set the cap from Keyword Planner's first-page estimate, not from break-even, and say plainly that it buys data, not sales.

### M7. Cloud drops the checkout problems the live test found

Evidence: live test issue 3, "Both checkouts still show Carnivore Weekly: browser tab title 'Carnivore Weekly', the CW logo, and the Link line 'Pay securely at Carnivore Weekly'". Issue 4: "/tell checkout showed no Apple Pay or Link buttons". Cloud mentions neither. Hazel lists both (blockers 9, 10) but leaves them out of its gate.

A stranger from an Instagram ad who meets a different brand at the card form is a likely abandon or "unrecognised charge" dispute, and a Misrepresentation flag on Google. Most Meta clicks will be phones without Apple Pay.

Fix: both items go into the launch gate.

### M8. Neither plan tests the paid return inside Instagram or Facebook in-app browsers before spending

Evidence: `tell.html` line 464 keeps the chat in `sessionStorage` across the Stripe redirect, and line 493 says "new tab or device: begin again, already paid". In-app browsers often reopen the success URL elsewhere, so the buyer re-does the whole chat after paying. The live test was desktop Chrome only, and "Not tested: a real payment, the paid reading ... the refresh fix". Cloud only checks in-app browsers after a drop is seen (section 6, step 5).

Fix: one real $9.99 purchase started from the Instagram in-app browser, and one from desktop. Confirm the message appears, survives a refresh, and comes back on the start screen. Do this before the first ad.

### M9. Sample lines are quoted as product output but were never produced by the live product

Evidence: Hazel says the samples are "verbatim `cardLine` values from the made-up sample pets". The prompts doc presents them as illustrative samples (intake "made up"), and nothing shows they came from the live endpoint. Hazel's creative rule says to make the card "by running the sample intake ... through the live /tell", yet its ad text quotes the doc lines, and a live run will produce different words. Cloud renders the doc lines through `makeCard()` and labels them only "Sample message from Waffles, a beagle", with no "made-up".

Fix: run each sample intake through the live product once. Use that run's real line in both the ad text and the image, or keep the doc line and say "Sample, made-up beagle" everywhere it appears. This also satisfies the "actual product images" rule.

### M10. "Reading" is still on the paid path, and in Cloud's Meta ads

Evidence: Cloud concept 3 "(Sample reading for Duchess, a cat.)" and header strip "Sample reading: Duchess, a cat"; concept 5 "Sample reading for [name]"; Must 1 "Sample reading for Waffles". On `/tell` today: the meta description "A playful reading in your pet's own voice", the schema description, line 232 "Their reading is", "See ... reading again" (line 511), and "Include this reading" (line 624). This was red team #7, and Cloud does not fix it.

Fix: "sample message" in all Cloud creative. Apply Hazel blocker 15 to the `/tell` meta description and schema as well.

### M11. Paid landing pages still link to the medium product through the logo

Evidence: `tell.html` line 217 `<a class="brand" href="/">` and footer line 266 `<a href="/">My Little Shadow</a>`. The article navs do the same (line 112). The home page line 298: "a gentle medium helps you hear from them". Both plans remove only the `/bridge` footer link. Hazel claims "No paid link to the home page".

Google reviews the whole site for Unreliable claims (psychic services). The domain-level risk stays either way, but a paid visitor is one tap from the medium product.

Fix: on paid variants (`pet=` or paid `utm_medium`), point the logo at `/tell` and drop the footer home link. Accept and record the remaining domain-level policy risk.

### M12. Free retry still promoted on pages one tap from the ad

Evidence: `terms.html` line 62, "You'll be offered one free retry with new answers, on us."; line 69, "(a free retry or a full refund)"; `contact.html` line 54, "you can try again with new answers, free"; `privacy.html` line 56, "use your free retry". All are linked from the `/tell` footer. Hazel gates only the `/tell` footer (13); Privacy (20) is ungated, and Contact and Terms are not mentioned. Cloud makes Contact and Privacy nice-to-have.

Fix: gate all four. Terms should lead with the refund and describe the retry only as an option inside the rating flow.

---

## 3. Minor

- **m1. Hazel H12 plus H13 repeat the price.** "Free chat, then $9.99 USD | $9.99 USD, share card included" says the price twice and never says message. "Make one about your dog | Start your dog's message" is two calls to action with no product. Pin H1/H2 to position 1, or drop H13.
- **m2. Cloud "Funny notes from your dog" (pinned position 1).** The product is one message, not notes. Use `A funny message from your dog`.
- **m3. Cloud "Five quick questions to start" and page "Five quick questions".** The host is a model and the count varies. Use "A few quick questions".
- **m4. Hazel callout "Photos never stored".** `privacy.html` says photos go to Anthropic, which "may keep it for a limited time for safety". Use `Photos not kept by us` or drop it.
- **m5. Cloud negatives are thinner and phrase match starts on day one.** Missing compared with Hazel: `quotes`, `generator`, `kid`, `children`, `tarot`, `"mind reading"`, `"put down"`, `"why does"`, `behavior`, `personalized`. "what would my dog say quotes" and "... generator" will match the phrase keywords. Merge Hazel's list into Cloud's and start on exact match.
- **m6. Low-volume exact keywords (Hazel).** [what would my dog say if she could talk] and similar will probably sit at "low search volume". Check Keyword Planner first, as Cloud says.
- **m7. Break-even ignores model and voice cost and Canadian card fees** (both plans say "not measured"). Fine for a learning test. Measure one reading's API cost before round 2.
- **m8. Contact has no business identity** (Hazel 18, Cloud nice-to-have 3). Google advertiser verification will ask anyway. Add one line before Search, not before Meta.
- **m9. Schema** still says `applicableCountry: "CA"` and `FreeReturn` (lines 206, 209), and the description still says "reading" and "Money back if it doesn't sound like them".
- **m10. Hazel blocker 8 is partly stale.** Code now remembers the paid session and message in `localStorage` (lines 278 to 282, 573) and offers it back after a reload (lines 506 to 518). So "Start another pet" no longer loses it on the same device. Only the latest paid message is kept, and the retry clears it (line 538). Keep the confirm prompt, but the bigger gap is M8.
- **m11. "in their own words"** (Hazel H5, sitelink line "In a dog's own cheeky words") edges toward a translation claim. "in a funny voice" or "in their own voice" is safer.

---

## 4. First red team's Top 10: fixed in the plan, or fixed on the site?

| # | Problem | In the plans | On the live site today |
|---|---|---|---|
| 1 | Ads never show the product | Fixed in both (sample-line descriptions, Meta creative). Sample description is unpinned, so it shows only part of the time. | n/a |
| 2 | Blind bidding | Fixed on paper in both. Hazel's $0.27 cap is incoherent (M6). | **Not done.** No Ads link, no pixel, no `chat_ready`/`chat_started`, unwanted referral unknown. |
| 3 | Bad keywords | Fixed in both. Grief and psychic risk on "letter/message from" remains (M4). | n/a |
| 4 | Page shows nothing | Specified in both | **Not done.** No sample, no `pet=`, H1 unchanged. |
| 5 | Free retry promoted | Fixed in all ads of both | **Not done.** `/tell` line 265, Terms 62/69, Contact 54, Privacy 56. |
| 6 | Defensive copy | Hazel fixed; Cloud regresses (refund x3 on page, D4) | **Not done.** Footer "not mind reading"; article FAQs. |
| 7 | Routed to the medium product | Partly. Bridge footer link removed in both; logo to home remains; Cloud Meta says "reading". | **Not done.** Footer `/bridge` link live. |
| 8 | Paid messages vanish | Not addressed directly | **Partly done in code** (localStorage restore) but **untested**; in-app browser path still re-runs the chat. |
| 9 | Money-back mismatch | Fixed in ad wording (both) | **Not done.** Lines 232 and 256 and all articles still say "you get your money back" with no condition. |
| 10 | Housekeeping | Specified | **Not done.** Voice on, schema, Contact identity. |

---

## 5. Which plan to run

**Run Cloud's structure with Hazel's copy discipline.** Cloud has the right channel order, budget shape, objective, kill rules and tracking detail. Hazel has the cleaner ad assets, the better trust handling, the larger negative list and the checkout blockers Cloud forgot.

Take from **Cloud**:
- Section 1 channel call: Meta first, $100 over 10 days, Search built but paused. Section 4 structure: Traffic objective, landing page views, one ad set, US and CA, Quebec excluded, 18+, no Audience Network.
- Section 2 Musts 1, 2, 4, 5, 6. For Must 5, remove the `/bridge` footer link outright (simpler than Hazel's conditional hide). Must 1 sample cards, with "made-up" added to the caption (M9).
- Section 3 tracking plan entirely (GA4 unwanted referrals, key events, Meta pixel events, `eventID` dedupe, weekly Stripe reconcile).
- Section 6 stop and go rules entirely, plus the Search rules ($2 cap, $60 stop).
- Meta concept 1 (microwave), with Hazel V1's "made from a made-up beagle" label. Concept 2 (sink), with "Whether she actually loves you" cut (C2). Concept 5 (real run, permissioned real pet), labelled "Sample message", not "reading".
- RSA pinning approach (position 1 names the pet and the message; position 2 gives price or a call to action).

Take from **Hazel**:
- The single trust asset: callout `Refund by email, 30 days`. Drop Cloud D4 and Cloud's three page guarantee lines. Hazel blocker 13 footer wording is the one refund line on the page.
- RSA assets. Position 1 pins: `A funny message from your dog`, `What would your dog say?`, `Your dog's funny AI message` (Cloud H2). Position 2 pins: `Free chat, then $9.99 USD`, `Start your dog's message`, `$9.99 USD, share card included`. Unpinned: Hazel H3 to H11 and H15 (drop H14). Descriptions: Hazel D1, D3, D4 plus the AI-labelled sample line from M1, with D3 or the AI sample pinned to description position 1. Mirror for cat.
- Callouts and structured snippet, minus `Photos never stored` (m4).
- Negative list, plus the grief and psychic additions in M4 and Cloud's `quiz` and `telepathic`.
- Exact match first. Launch keywords limited to the "what would my dog/cat say" family (M4).
- Ad-group-level sitelinks, but only "See a sample message" and "Questions to ask your dog/cat" at first. The habit-article sitelinks wait for C1.
- Blockers 7, 9, 10, 15, 18, 19, 20 as launch or pre-Search items (M7, M8, M10, M12).

Do not take: Hazel's $0.27 cap, Hazel's per-ad $18 purchase kill, Hazel's 2/3-1/3 split (Search stays paused), Cloud's "roasts" and "notes" headlines, Cloud concept 3 as written.

---

## 6. Launch gate (all must be true before any money is spent)

Page and product, checked live on `mylittleshadow.com/tell?bust=N`:
- [ ] Hero shows a sample card labelled "Sample" and "made-up", above the fold on a 375 x 667 phone, with Start still visible.
- [ ] `?pet=dog` and `?pet=cat` change the H1 to "What would your dog/cat say?" and swap the card. The default H1 has a noun. AI is named in the hero lede.
- [ ] Price under Start reads free chat plus $9.99 USD in body-size text. "Reading" is gone from the price line, buy area, meta description and schema.
- [ ] Exactly one refund line on `/tell`, worded as an email refund within 30 days. No "try again free" anywhere on `/tell`, Terms, Contact or Privacy, except the button inside the under-3-stars flow.
- [ ] No `/bridge` link on `/tell`. The logo and footer home link on paid variants do not lead to the home page.
- [ ] Voice is off by default.
- [ ] One real $9.99 purchase from desktop and one from the Instagram in-app browser: message shown, survives refresh, offered back after reload, statement shows LITTLE SHADOW.
- [ ] Stripe checkout for `/tell` shows My Little Shadow (no Carnivore Weekly tab title, logo or Link line), and Apple Pay appears on an iPhone.
- [ ] Sample lines in ads either come from a real live run or are labelled "Sample, made-up" wherever they appear.

Tracking:
- [ ] `checkout.stripe.com` (and `stripe.com` contains) set as GA4 unwanted referrals. `purchase` marked as a key event. A test purchase shows in GA4 with source `test`, not `stripe.com`.
- [ ] `chat_ready` fires once when the host hands over. Meta pixel fires PageView, StartChat, ChatReady, InitiateCheckout, Purchase (checked in Test Events). Domain verified.
- [ ] Privacy page and the `/tell` footer name the Meta pixel.

Ads:
- [ ] Cloud concept 2 has no "actually loves you" line. Concept 3 is not in round 1. No "reading" in any creative.
- [ ] Every Meta primary text says AI and states $9.99 USD. "Free" appears only next to the price.
- [ ] Budget set ($100 suggested), account currency chosen, and the stop rules (Cloud section 6) written where Brew will see them on day 1 and at $50.

Before Search (later, not round 1):
- [ ] Articles retitled and cleaned per C1 before any article sitelink.
- [ ] `#sample` and `#how` ids exist and `#sample` opens on arrival.
- [ ] Every served RSA combination says AI (pinned description).
- [ ] Contact page shows the business name and province. Schema corrected.
- [ ] Grief and psychic negatives from M4 added. "letter/message from" keywords held until two clean search-term reviews.
