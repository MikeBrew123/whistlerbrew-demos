# Green team: paid acquisition plan for "What they'd tell you"

Date: 2026-11-01
Product: mylittleshadow.com/tell. A playful AI message for a living pet: chat with a host (type or talk, optional photo), then the pet answers in first person. Portrait, answers to up to three questions, a closing line, a shareable card. Chat free, $9.99 USD one-off. Full refund by email within 30 days.
Built from: `ads-review/2026-11-01-research.md` (cited as "research §n"), `ads-review/2026-11-01-red-team.md` ("red team §n"), the live pages, and the Waffles, Duchess and Clementine samples in `2026-10-31-what-theyd-tell-you-prompts.md`.
Rules followed: no free retry anywhere, no psychic/translate/mind-reading claims and no defensive "not mind reading" lines, nothing grief-related, no invented reviews, numbers or urgency, sample lines labelled as samples, no em dashes, no emojis. The word "free" does not appear in any ad below, so the $9.99 is never at odds with it.

---

## 1. Verdict

Run Meta (Instagram and Facebook) first, and hold Google Search until the page has shown it can sell. The evidence: the searches closest to this product ("what would my dog say", "if my dog could talk", "what is my dog thinking") are mostly curiosity, book, meme and free-app intent, with no source showing buying intent (research §1). Google Search in Animals and Pets costs about $3.97 to $4.06 a click (WordStream/LocaliQ 2025 and 2026, research §3), so $100 buys about 25 clicks. Meta Pets and Animals CPC estimates run about $0.76 to $1.12 (Megadigital; Digital Applied 2026) with CPM about $9.58 to $15 (Digital Applied; arapovk), so $100 buys roughly 90 to 130 clicks and about 6,700 to 10,400 impressions. Several sources say novel, visual, impulse products fit Meta first (research §3, opinion pieces), and the product already makes a 1080 x 1350 card, which is exactly Meta's 4:5 feed size. The first $100 is not meant to make money: at about $9 net a sale and about $1 a click, breaking even needs roughly 1 in 11 clicks to buy, which is unlikely from cold traffic. It is meant to answer three questions: (1) which sample-line hook gets pet owners to click, (2) how many of them start and finish the free chat, and (3) whether anyone who finishes pays $9.99 and rates it 3 stars or more. Every stage gets an event, so the $100 shows where people drop off even with zero sales.

---

## 2. Funnel fixes before any paid click

Ranked. "Must" means no paid click until it ships. All are in `public/shadow/tell.html` unless noted. Copy is in Hazel's daylight voice.

### Must 1. Show the product above the fold (about 45 min)

Why: the page shows nothing until minutes of typing (red team §4). The ads below sell with a card and a line, so the page has to show the same card in the first screen.

- Render two sample cards with the existing `makeCard()` code (no photo, so it draws the yellow square and silhouette): Waffles (dog) with `cardLine` "The microwave beeps, I answer. That's just good manners." and Duchess (cat) with "I don't need anyone. I just need you at the sink every morning." Add a small "Sample" pill at the top-left of each image. Save as `public/shadow/sample-waffles.jpg` and `sample-duchess.jpg` (about 1080 x 1350, compressed under 150 KB). These same files are the Meta ad images (section 4), so page and ad match.
- Place the card in the intro: on phones, order is kicker, H1, card (width `min(62vw, 260px)`, rotated -1.5deg like `.keepsake img`), Start button, price line, then lede and steps. On desktop, two columns: text left, card right. Start must stay above the fold on a 375 x 667 screen; shrink the card before pushing the button down.
- Caption under the card: `Sample card from Waffles, a beagle.`
- Below the steps, add `<details id="sample">` titled `See a full sample` containing Waffles' sample from the prompts doc: title, portrait, the socks answer, the cat answer, and the closing line, headed `Sample reading for Waffles, a beagle`. Leave out the stiff-leg question. Add `gtag("event", "view_sample")` when it opens.

### Must 2. Headline and lede that match the ads (15 min)

Why: H1 "Let them finally get a word in." has no noun and does not echo any ad or query (red team §1, §4). AI is only mentioned in the footer (red team §3).

- Kicker: `What they'd tell you`
- H1 default: `Your pet has a few things to say.`
- H1 with `?pet=dog`: `What would your dog say?` and with `?pet=cat`: `What would your cat say?` The same parameter swaps the card to Waffles or Duchess. Ten lines of JS reading `URLSearchParams`. Keep the parameter when the page restores after Stripe (it is stripped by `history.replaceState`; harmless, since by then the chat is under way).
- Lede: `Tell our host about them: three words, one habit, a routine you share, and up to three questions. Then they answer you, in first person. A playful AI message made from your stories, plus a card to share.`
- Start button label: `Start the chat`

### Must 3. Price and guarantee where the decision happens (15 min)

Why: price is small grey text that reads as a surprise after minutes of chat (red team §4). FTC guides say a money-back claim must state its conditions (research §4, 16 CFR 239). The owner allows the guarantee only as a secondary line.

- Directly under Start, normal body size and colour (not `.small`): `Five quick questions, typed or spoken. The chat is free. Their message is $9.99 USD, paid once at the end.`
- One line under that, in `.small`: `Money-back guarantee: email us within 30 days of buying for a full refund.`
- The line under "Hear from them, $9.99" (`.promise`, line 256) becomes: `Money-back guarantee: a full refund if you email us within 30 days.`
- Footer line 265 becomes: `Money-back guarantee: email hello@mylittleshadow.com within 30 days of buying for a full refund, handled within 24 hours.` This removes "try again free" from the paid landing page. The retry button stays only where it is now, inside the under-3-stars flow.

### Must 4. Voice off by default (5 min)

Why: a paid click on a phone at work or in bed gets a page that talks out loud with no warning (red team §4).

- `let voiceOn = false; try { voiceOn = localStorage.getItem("tell.voice") === "on"; } catch {}`
- Button text when off: `Turn voice on`. Keep the "Hear it out loud" button on the reading, which is the real showcase for the voice. It plays on tap.

### Must 5. No path from the paid page to The Rainbow Bridge (2 min)

Why: owner rule. The `/tell` footer links straight to `/bridge` (line 266).

- Remove `<a href="/bridge">The Rainbow Bridge</a>` from the `/tell` footer. The host's existing grief hand-off in the chat stays: it is a safety response, not promotion.

### Must 6. Tracking hooks (20 min, details in section 3)

- Fire `gtag("event", "chat_ready")` once when the host returns `ready` (where `$("say").classList.add("ready")` runs in `hostTurn`).
- Add the Meta pixel (section 3) with `StartChat`, `ChatReady`, `InitiateCheckout` and `Purchase`.
- Privacy page (`public/shadow/privacy.html` line 71) and the `/tell` footer: add the Meta pixel. Suggested: `On What they'd tell you we also use the Meta pixel to measure our ads: a page view, a chat starting, a checkout starting and a purchase. Meta uses cookies.` Footer: `We use Google Analytics and the Meta pixel to count visits.`

### Nice to have (do before Google, or in round 2)

1. OG image for `/tell`: swap the dusk sunset `og.jpg` for the Waffles sample card, so shared `/tell` links show the product.
2. Guides (`public/shadow/articles/*.html`): the price lines say "you get your money back" with no condition. Change to `Money back within 30 days, by email.` Required before any guide is used as a paid landing page.
3. Contact page: add `My Little Shadow, a small independent project in British Columbia, Canada` (Terms already says this). Thin business info draws Misrepresentation scrutiny on Google (red team §5).
4. Product schema on `/tell`: `applicableCountry` lists only CA and `returnFees: FreeReturn` describes a physical return. Add US, or drop `hasMerchantReturnPolicy`.
5. `contact.html` line 54 and `privacy.html` line 56 still promote the free retry. Reword to the refund line above.
6. Home page overclaims ("sounds exactly like them", "a little too accurate", "uncannily specific"). No ad links there, so this is not urgent.
7. A 10-second "Hear a sample" audio clip of Waffles' narration under the sample card. Voice is a real difference from a free ChatGPT prompt (red team §3).

---

## 3. Tracking plan

What already exists in `tell.html`: GA4 `G-6KL3XFSD8V`; events `start_tell` (Start click), `begin_checkout` (value 9.99 USD), `purchase` (on return with `?paid=`, `transaction_id` = Stripe Checkout session id, value 9.99, currency USD, guarded so a refresh does not resend), `reading_given`, `save_card`, `share`, `rate_reading`. Stripe returns to `https://mylittleshadow.com/tell?paid={CHECKOUT_SESSION_ID}` (`src/app/api/bridge/purchase.ts` line 61). There is no Stripe webhook, but the edge route `/api/bridge` already confirms each paid session with Stripe on the server. That gives a server-side option below.

### GA4 (Brew, about 15 min)

1. Admin, Data streams, the web stream, Configure tag settings, Show more, **List unwanted referrals**: add `checkout.stripe.com` (Stripe's own advice, research §7). Also add `stripe.com` with "contains" to catch 3-D Secure pages. The 3-D Secure host is not verified.
2. Admin, Events (or Key events): mark `purchase` as a key event. Also mark `chat_ready` once it has fired once. Leave the others as plain events.
3. Admin, Data retention: set event data to 14 months.
4. Check it works: Brew runs one real $9.99 purchase on his own or a friend's pet (this also produces the video in section 4), with `?utm_source=test&utm_medium=test` on the URL. In Realtime or DebugView, confirm `purchase` shows with value 9.99 and source `test`, not `stripe.com`. Not verified: whether GA4 dedupes a repeated `transaction_id` on its own. The page guard covers the normal case.
5. Every Monday, compare the count of GA4 purchases against Stripe payments with metadata `app` = tell. A gap means lost return trips (closed tab, in-app browser).

### Google Ads (only when the Search test starts)

1. GA4 Admin, Product links, Google Ads links: link the account. Make sure auto-tagging (gclid) is on in Google Ads account settings.
2. Google Ads, Goals, Conversions, New conversion action, Import, Google Analytics 4 properties, Web: pick `purchase`. Set it as Primary, use the value from GA4, count "Every". Import `chat_ready` as Secondary so you can see it without bidding on it.
3. Imported GA4 conversions show up with a delay (often hours, exact lag not verified). Judge the test on days, not hours.
4. Enhanced conversions need the buyer's email on the page, and the page never has it (Stripe collects it). Skip.
Menu names above are from memory and Google renames them often. Treat as not verified.

### Meta (Brew sets up, developer adds code, about 30 min)

1. Events Manager, Connect data, Web: create a dataset (pixel) named `My Little Shadow`. Give the ID to the developer.
2. Business settings, Brand safety, Domains: add `mylittleshadow.com` and verify with the DNS TXT record in Cloudflare.
3. Pixel code in `tell.html` `<head>`, inside the same `if (location.hostname.endsWith("mylittleshadow.com"))` block as GA, so local and preview builds stay out. Events:
   - Start click: `fbq('trackCustom', 'StartChat')`
   - `ready`: `fbq('trackCustom', 'ChatReady')`
   - Checkout click: `fbq('track', 'InitiateCheckout', { value: 9.99, currency: 'USD' })`
   - Paid return, inside the existing guard next to the GA `purchase`: `fbq('track', 'Purchase', { value: 9.99, currency: 'USD' }, { eventID: paid })`
4. Conversions API options, simplest first:
   - **A. Pixel only.** Fine for a $100 test. Some events will be lost to blockers and in-app browsers, so reconcile against Stripe weekly.
   - **B. Server event from the existing edge route.** When `/api/bridge` first confirms a paid session with Stripe (`loadPurchase`/`savePurchase` in `src/app/api/bridge/purchase.ts`), POST a `Purchase` to the Graph API `/{dataset_id}/events` with `event_id` = the checkout session id (the same `eventID` the pixel sends, so Meta dedupes the two), `action_source: "website"`, `event_source_url`, client IP and user agent from the request headers, `fbp`/`fbc` cookies passed up in the request body, and the SHA-256 hashed email from the Stripe session's `customer_details.email`, which the server already fetches. About 40 lines plus a `META_CAPI_TOKEN` secret. Do this in round 2 if pixel purchases and Stripe disagree.
   - **C. Cloudflare Zaraz** can run the Meta pixel from the edge with server-side delivery. Not verified for this setup.
   Not verified: current Graph API version and whether Meta still requires any event-priority setup (Aggregated Event Measurement) for a new domain. Check Events Manager after domain verification.
5. URL parameters on every Meta ad: `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign=tell_meta_r1&utm_content={{ad.name}}`. GA4 then splits every stage by ad.

### The funnel you will read (GA4, filtered to `utm_campaign=tell_meta_r1`)

Landing sessions, then `start_tell`, then `chat_ready`, then `begin_checkout`, then `purchase`, then `rate_reading`. Add `view_sample` to see whether the sample helps.

---

## 4. Primary channel: Meta campaign, ready to paste

### Accounts (one time)

A Meta Business portfolio, a Facebook Page "My Little Shadow" and a linked Instagram professional account "mylittleshadow" (or the closest free handle). Meta needs a personal profile to own the Business portfolio, but nothing is ever posted from it. Ads run under the Page name.

### Structure

- **Campaign**: `tell_meta_r1`. Objective: **Traffic**. Performance goal: **Maximize number of landing page views**. Advantage campaign budget off (one ad set anyway).
  Why Traffic and not Sales: purchase optimisation needs about 50 events a week (agency sources), or 10 by one account (research §3), so $100 cannot get out of learning either way. Landing page views give the most comparable clicks per hook, and GA4 measures what happens next. The trade-off: Traffic campaigns find people who click, not people who buy. If start rate is poor (section 6), round 2 switches to Sales optimised for the `ChatReady` custom event.
- **Ad set**: `r1_broad_us_ca`
  - Locations: United States and Canada, "people living in". Exclude Quebec: the page is English-only, and Quebec's French-language rules for commercial ads were not researched (not verified).
  - Age: minimum 18 (Terms require 18+). Advantage+ audience on, with audience suggestions "Dogs", "Cats", "Pets". Leave gender open. The dog and cat creatives do the sorting.
  - Language: English.
  - Placements: Advantage+ placements, but exclude Audience Network (in-app clicks away from Meta's feeds are hard to read). That leaves Facebook and Instagram Feed, Stories, Reels.
- **Ads**: 3 in round 1 (concepts 1, 2, 5 below). If the video is not ready, use concept 3 instead. Concepts 3 and 4 wait for round 2. Fewer ads means each one gets enough clicks to compare.

### Budget (Brew's choice)

My suggestion: **$100 lifetime, $10 a day for 10 days.** Ten days covers two weekends and gives Meta room to spread delivery. Arithmetic from the research ranges (not a forecast): $100 at $0.76 to $1.12 a click is about 90 to 130 clicks, about 30 to 45 per ad across 3 ads. That is enough to compare click rates and chat starts, and not enough to compare purchases. If Brew prefers faster answers, $20 a day for 5 days gives the same total with less weekend coverage. More than $100 before section 6's checkpoints makes no sense.

Account currency is Brew's call and cannot easily change later: USD matches the price in reports, CAD matches his card.

### Ad concepts

All images are the real card format the product makes (1080 x 1350, 4:5), so the ad shows exactly what a buyer gets. Every one carries a visible "Sample" pill. CTA button: **Learn more** on all ads.

**Concept 1. "The microwave" (dog, static). Round 1**
- Visual: `sample-waffles.jpg` from Must 1: sunny yellow photo square with the beagle silhouette, "A message from Waffles", the line in big type, "mylittleshadow.com" at the foot, "Sample" pill top-left.
- Sample line: Waffles, "The microwave beeps, I answer. That's just good manners."
- Primary text:
  > "The microwave beeps, I answer. That's just good manners."
  > Sample message from Waffles, a beagle.
  >
  > Tell our host about your dog: three words, one habit, a routine you share, and the questions you've always wanted to ask. Then your dog answers you, in first person. A playful AI message made from your stories, with a card like this one.
  >
  > $9.99 USD.
- Headline: `What would your dog say?`
- Description: `One message and one card, $9.99 USD`
- URL: `https://mylittleshadow.com/tell?pet=dog&` plus the UTM string. Ad name `c1_microwave`.

**Concept 2. "The sink" (cat, static). Round 1**
- Visual: `sample-duchess.jpg`: silhouette version with the cat shape, "A message from Duchess", the line, "Sample" pill.
- Sample lines: Duchess, "I don't need anyone. I just need you at the sink every morning." and, from her answers, "Draw your own conclusions."
- Primary text:
  > "I don't need anyone. I just need you at the sink every morning."
  > Sample message from Duchess, a grey tabby.
  >
  > Ask your cat the things you've always wondered. Why the rings end up on the floor. Whether she actually loves you. Tell our host about her, and she answers in first person. (Sample answer: "Draw your own conclusions.")
  >
  > A playful AI message made from your stories, plus a card to share. $9.99 USD.
- Headline: `What would your cat say?`
- Description: `One message and one card, $9.99 USD`
- URL: `/tell?pet=cat&` plus UTMs. Ad name `c2_sink`.

**Concept 3. "You asked, she answered" (cat, static Q and A). Round 2, or round 1 if no video**
- Visual: 4:5 crop of the real reading screen styled exactly like `.qa` in `tell.html`: a dark question bubble "Do you actually love me?" and a paper answer bubble with Duchess' answer. Header strip: "Sample reading: Duchess, a cat". Daylight gradient background.
- Sample line: "I sit in a wet sink for you every single morning. I lie on a breathing chest through the weather report. Draw your own conclusions. I am not going to say it out loud."
- Primary text:
  > You asked: "Do you actually love me?"
  > She said: "I sit in a wet sink for you every single morning. Draw your own conclusions."
  > (Sample reading for Duchess, a cat.)
  >
  > Give our host three words, one habit and a routine, then ask your pet up to three questions. Playful AI answers, in their voice, with a card to share. $9.99 USD.
- Headline: `Ask your pet 3 questions`
- Description: `$9.99 USD, one message, one card`
- URL: `/tell?pet=cat&` plus UTMs. Ad name `c3_qa`.

**Concept 4. "The thump" (rabbit, static, for every-pet reach). Round 2**
- Visual: Clementine card. The silhouette code only has a dog and a cat, so use a real rabbit photo Brew has rights to (or skip until one exists). "Sample" pill.
- Sample line: Clementine, "I am small, but the thump is not."
- Primary text:
  > "I am small, but the thump is not."
  > Sample message from Clementine, a Holland lop who thumps when dinner is late.
  >
  > Dogs, cats, rabbits: every pet has opinions. Tell our host theirs, and they answer you in first person. A playful AI message made from your stories, with a card to share. $9.99 USD.
- Headline: `Every pet has opinions`
- Description: `One message and one card, $9.99 USD`
- URL: `/tell?` plus UTMs. Ad name `c4_thump`.

**Concept 5. "Watch one happen" (dog, 9:16 video, 15 to 20 s). Round 1**
- Source: a phone screen recording of one real run of the live product (Brew's $9.99 test purchase from section 3, on his own or a friend's dog with permission). Use whatever the real reading says. If no line is good enough, do not use it.
- Edit: 0 to 3 s, the finished card full screen with the best line as burned-in caption, the product's own narration voice reading it. 3 to 7 s, the chat sped up 4x (two or three bubbles visible: "Three words?" and the answer). 7 to 15 s, the reading reveals, "Hear it out loud" plays one answer, captions on. 15 to 18 s, end frame: `$9.99 USD. mylittleshadow.com/tell`. "Sample reading" label in a corner the whole time. Captions on every spoken line (most people watch muted).
- Primary text: same as concept 1, with the real pet's name and line in the first two lines, labelled "Sample reading for [name], shared with permission."
- Headline: `What would your dog say?`
- Description: `One message and one card, $9.99 USD`
- Placements: Reels and Stories (Meta will also crop for feed). Ad name `c5_video`.

Notes on all concepts:
- Each one opens on a pet line, not a description of the product.
- "AI" appears in every primary text, so nobody thinks a person wrote it.
- No "free", no guarantee, no retry, no claims about knowing what pets think. The guarantee lives on the page.
- Meta may add an "AI info" label (research §4). That is fine.

---

## 5. Google Search: rebuilt, on hold

**Recommendation: build it now, keep it paused.** Turn it on only after the Must fixes are live, Meta round 1 shows at least one purchase or a healthy `chat_ready` rate, and Brew has checked Keyword Planner. Reasons: about 25 clicks per $100 at benchmark CPCs (research §3); curiosity intent on the closest phrases (research §1); and at about $4 a click a sale breaks even only if more than 1 in 5 clicks buys. Its real value is search-term data: which exact phrases bring people who finish the chat.

### Campaign settings

- Name `tell_search_t1`. Search only: no Display, no Search Partners.
- US and Canada, "Presence" only, excluding Quebec (same reason as Meta). English.
- Budget (Brew's choice): suggested $6 a day, capped at $60 total. Bidding: Maximize clicks with a max CPC limit Brew sets. My suggestion is $2, half the benchmark: fewer impressions, cheaper reads. If there are no impressions after 3 days, raise it to $3. Switch to conversion bidding only after 15+ conversions in 30 days (Google's own floor for tROAS, research §3), which this test will not reach.
- Final URL suffix: `utm_source=google&utm_medium=cpc&utm_campaign=tell_search_t1&utm_content={adgroupid}`. Auto-tagging on.

### Ad group A: Dog. Final URL `https://mylittleshadow.com/tell?pet=dog`

Keywords (verify volume in Keyword Planner and delete any marked "low search volume"):
```
[what would my dog say]
"what would my dog say"
"what would my dog say to me"
"message from my dog"
"letter from my dog"
"funny letter from my dog"
```

### Ad group B: Cat. Final URL `https://mylittleshadow.com/tell?pet=cat`

```
[what would my cat say]
"what would my cat say"
"what would my cat say to me"
"message from my cat"
"letter from my cat"
"funny letter from my cat"
```

Not bid on, on purpose: "what is my dog/cat thinking" and "if my dog could talk" (behaviour research, books, memes; research §1, red team §2), "dog translator" (we cannot write a matching ad without a translate claim), anything with "app", "gift" or "personality test". The three guides already serve curiosity searches for free. If Brew later wants to buy curiosity traffic, it goes to the guide that matches (`/what-would-my-dog-say`, `/what-is-my-cat-thinking`, `/questions-to-ask-your-dog`), never `/tell`, and only after nice-to-have 2.

### Negative keywords (campaign level)

Single words are broad-match negatives. Google does not add plurals to negatives, hence the pairs.
```
free
app
apps
apk
download
"app store"
"play store"
game
games
kids
"talking tom"
meme
memes
tiktok
filter
"voice changer"
voiceover
video
videos
youtube
reddit
quiz
test
chatgpt
book
books
song
lyrics
movie
poem
why
"body language"
signs
meaning
science
translator
translate
collar
button
buttons
device
training
trainer
psychic
"pet medium"
"animal medium"
communicator
telepathy
telepathic
death
died
dead
passed
loss
grief
memorial
"rainbow bridge"
heaven
"in memory"
remembrance
euthanasia
vet
sick
symptoms
pain
print
printed
canvas
portrait
mug
shirt
ornament
amazon
etsy
job
jobs
```
Left off on purpose: "toy" (would block toy breeds), plain "medium" (would block "medium sized dog"), "ai" (wanted). Check Search terms every 2 or 3 days and add misses.

### Responsive Search Ads

Pinning: yes, deliberately. Google always shows headline positions 1 and 2, and position 3 only sometimes. To guarantee any combination says what it is, **four headlines are pinned to position 1** (each names the pet and says funny message in their voice) and **three are pinned to position 2** (each gives the price or a call to action). The other eight are unpinned and fill position 3. Pinning several options to each position follows Google's own advice (research §5). Ad Strength will drop. It is not used in the auction (Google Ads Liaison, research §5), so ignore it.

Counts were measured with a Python `len()` script and include spaces and punctuation. All headlines are under 30, all descriptions under 90.

**Ad group A (Dog)**

| # | Headline | Chars | Pin |
|---|---|---|---|
| 1 | A funny message from your dog | 29 | Position 1 |
| 2 | Your dog's funny AI message | 27 | Position 1 |
| 3 | Your dog roasts you, kindly | 27 | Position 1 |
| 4 | Funny notes from your dog | 25 | Position 1 |
| 5 | Get yours for $9.99 USD | 23 | Position 2 |
| 6 | Start your dog's message | 24 | Position 2 |
| 7 | One message and card, $9.99 | 27 | Position 2 |
| 8 | What would your dog say? | 24 | none |
| 9 | Like a letter from your dog | 27 | none |
| 10 | Ask your dog 3 questions | 24 | none |
| 11 | Comes with a card to share | 26 | none |
| 12 | Made by AI from your stories | 28 | none |
| 13 | Hear it read out loud | 21 | none |
| 14 | Five quick questions to start | 29 | none |
| 15 | Their habits, their crimes | 26 | none |

| # | Description | Chars |
|---|---|---|
| 1 | Sample, Waffles the beagle: "The microwave beeps, I answer. That's just good manners." | 86 |
| 2 | Tell our host about your dog. Then your dog answers your questions, in first person. | 84 |
| 3 | You get a short funny message, answers to your questions and a card to share. $9.99 USD. | 88 |
| 4 | Full refund if you email us within 30 days of buying. Start with your dog's name. | 81 |

Display path: `mylittleshadow.com/dog/message`

**Ad group B (Cat)**

| # | Headline | Chars | Pin |
|---|---|---|---|
| 1 | A funny message from your cat | 29 | Position 1 |
| 2 | Your cat's funny AI message | 27 | Position 1 |
| 3 | Your cat roasts you, kindly | 27 | Position 1 |
| 4 | Funny notes from your cat | 25 | Position 1 |
| 5 | Get yours for $9.99 USD | 23 | Position 2 |
| 6 | Start your cat's message | 24 | Position 2 |
| 7 | One message and card, $9.99 | 27 | Position 2 |
| 8 | What would your cat say? | 24 | none |
| 9 | Like a letter from your cat | 27 | none |
| 10 | Ask your cat 3 questions | 24 | none |
| 11 | Comes with a card to share | 26 | none |
| 12 | Made by AI from your stories | 28 | none |
| 13 | Hear it read out loud | 21 | none |
| 14 | Five quick questions to start | 29 | none |
| 15 | Their habits, their crimes | 26 | none |

| # | Description | Chars |
|---|---|---|
| 1 | Sample, Duchess: "I don't need anyone. I just need you at the sink every morning." | 82 |
| 2 | Tell our host about your cat. Then your cat answers your questions, in first person. | 84 |
| 3 | You get a short funny message, answers to your questions and a card to share. $9.99 USD. | 88 |
| 4 | Full refund if you email us within 30 days of buying. Start with your cat's name. | 81 |

Display path: `mylittleshadow.com/cat/message`

Worst-case pair check: "Funny notes from your dog | Start your dog's message" still says pet, funny message, action. "Your dog roasts you, kindly | Get yours for $9.99 USD" still says pet, funny voice, price.

### Sitelinks (campaign level, counted: text 25 or less, lines 35 or less)

| Text (chars) | Line 1 (chars) | Line 2 (chars) | URL |
|---|---|---|---|
| See a full sample (17) | A beagle, a microwave, opinions (31) | Plus his answers and his card (29) | `/tell#sample` |
| Questions to ask your dog (25) | Funny answers to classic questions (34) | Then ask your own pet (21) | `/questions-to-ask-your-dog` |
| What would my dog say? (22) | Nine dog habits, in their words (31) | With the plain reasons behind them (34) | `/what-would-my-dog-say` |
| What is my cat thinking? (24) | Nine cat habits, in their words (31) | With the plain reasons behind them (34) | `/what-is-my-cat-thinking` |

None link to the home page or The Rainbow Bridge. The guide sitelinks need nice-to-have 2 first.

---

## 6. Stop and go rules

Arithmetic first (estimates, not data): a sale nets about $9 after Stripe's fee (2.9% + 30c on a US card is about $0.59; Canadian-account and cross-border fees not verified; AI and voice cost per reading not measured). So break-even cost per purchase is about $9. Round 1 is not expected to hit that. The rules below decide whether it is worth a round 2. Thresholds marked (judgement) are my calls, not benchmarks.

### Meta round 1

| When | Check | Action |
|---|---|---|
| Day 1 | Ads approved; GA4 Realtime shows `paid_social` sessions with `utm_content`; pixel Test Events shows PageView and StartChat | If any is missing, pause and fix. Spend without tracking teaches nothing. |
| Each ad reaches about 1,000 impressions | Link click-through rate per ad | Pause any ad whose CTR is under half of the best ad's (judgement). Do not add new ads mid-round. |
| $50 spent | Funnel: sessions, `start_tell`, `chat_ready`, `begin_checkout`, `purchase` | **Stop** if `chat_ready` is zero, or if there is no `begin_checkout` at all. The page or chat is the problem, not the ads. Fix before spending the second $50. |
| $100 spent | Same funnel, plus ratings and refund emails | Stop. Write down the numbers. Decide on round 2. |

**Go to round 2 ($100 to $200 more, Brew's choice)** if all are true:
- At least one purchase from paid traffic, and no buyer rated under 3 stars or asked for a refund.
- One hook clearly beats the others on cost per `chat_ready`.
- Cost per `chat_ready` is under about $5 (judgement: if roughly 1 in 2 finishers paid, that would put a sale near $10, close to break-even).

**Stop paid acquisition for now** if there are zero purchases after $100 and fewer than about 10 `chat_ready` events. Put effort into getting 10 to 20 real readings from people Brew knows (direct messages, not posts) and use those as proof and creative. Then retest.

### What to change first if it underperforms (fix the earliest broken stage only)

1. **Low CTR on every ad**: the hook. Try the strongest real line from a friend's reading, or the video if it was not in round 1. Change nothing else.
2. **Good CTR, few `start_tell`**: the page. Check the hero shows the card on a phone (Instagram's in-app browser too) and the H1 matches the ad.
3. **Starts but few `chat_ready`**: the chat. Read where people stop. Likely fixes: shorter host messages, faster first reply, fewer questions before `[[READY]]`.
4. **`chat_ready` but few `begin_checkout`**: price and proof at the decision point. Put a second sample answer next to the "Hear from them, $9.99" button. Do not discount; there is no evidence a lower price helps.
5. **`begin_checkout` but no `purchase`**: Stripe or the return trip. Test checkout inside the Instagram and Facebook in-app browsers. Check Stripe for completed payments GA missed.
6. **Purchases but low ratings**: the reading prompt. Pass the `fb:` feedback to Hazel. Stop ads until it is fixed.

### Google test (if and when it runs)

- After $20 or 3 days: read Search terms, add negatives, delete keywords with impressions but no clicks.
- At $60: stop. Keep only search terms that produced `chat_ready` or a purchase. With none, Search stays off until there is brand or category demand.

---

## 7. What Brew must decide or do, in order

1. **Approve the page copy** in section 2 (H1s, lede, price and guarantee lines, voice off, Bridge link removed from `/tell`) and have Must 1 to 6 built and deployed. Nothing else starts before this.
2. **Choose the budget and pace** for Meta round 1 (suggested $100 over 10 days) and the ad account currency (USD or CAD).
3. **Set up Meta**: Business portfolio, Facebook Page "My Little Shadow", Instagram professional account, ad account with a card, domain verification by DNS TXT in Cloudflare, a dataset (pixel). Send the pixel ID to the developer.
4. **GA4**: add `checkout.stripe.com` and `stripe.com` as unwanted referrals, mark `purchase` (and later `chat_ready`) as key events, set 14-month retention.
5. **Do one real purchase** on your own or a friend's pet (with permission). This tests GA4 and pixel tracking end to end, and the screen recording becomes concept 5. Ask 3 to 5 friends with pets to try it by direct message. With permission, their best lines become round-2 creative and the first real samples on the page.
6. **Approve the three round-1 ads** (concepts 1, 2, 5) and launch. Check day 1, check at $50, stop at $100, using section 6.
7. **Later, only if round 1 earns it**: open Google Ads, complete advertiser verification, check the section 5 keywords in Keyword Planner, link GA4 and import `purchase`, then decide whether to switch on the paused Search test.
