# Green team: "What they'd tell you" paid plan (rebuild)

Date: 2026-11-01
Writer: Hazel
Voice: daylight only (living pets)
Replaces: `docs/shadow-content/2026-11-01-ads-and-directories.md` section A (Google Ads). The directory listings in section B of that draft still carry the free retry and must be rewritten before use; not covered here.
Answers: `ads-review/2026-11-01-red-team.md` (Top 10) using `ads-review/2026-11-01-research.md` as evidence.
Status: plan for Brew. Nothing here is live. No dollar budget is set here; that is Brew's call.

Counting: every asset in backticks is followed by its character count in brackets, measured with Python `len()` after the file was written (spaces and punctuation included). Limits used: headline 30, description 90, sitelink text 25, sitelink line 35, callout 25, snippet value 25, display path 15.

---

## A. Positioning

What they'd tell you gives your dog or cat the last word. You tell a friendly host the good stuff (the sock theft, the morning sink, the spot on the couch that is legally theirs) and you get back a short, funny message in their own voice, answers to the questions you have always wanted to ask them, a card made for the group chat, and an optional read-aloud version. It is made with AI from your stories, so the details are yours and the jokes only fit your pet. A free chat, then $9.99 USD. The ad's job is to show one line that makes an owner think "that is exactly mine", not to explain the host, the microphone or the refund.

---

## B. Pre-launch blockers (before $1 is spent)

Tag: **[Brew]** = public copy, pricing, branding or policy, needs Brew's approval. **[Ops]** = the main session can do it.

### Tracking (red team Top 10 #2)

1. **[Ops] Purchase conversion in Google Ads.** Link GA4 property `G-6KL3XFSD8V` to Google Ads and import the existing `purchase` event (`tell.html` line 482) as the primary conversion, value $9.99 USD. Alternative: a Google Ads conversion tag firing in the same spot. Note the event only fires when the buyer comes back to the same tab with `?paid=`; a server-side backup from the Stripe webhook is a later improvement, not a launch blocker.
2. **[Ops] Auto-tagging on** in Google Ads (gclid). Keep the UTMs below as well.
3. **[Ops] `checkout.stripe.com` added to GA4 unwanted referrals** (Stripe's own advice, research section 7). Without it the purchase is credited to stripe.com, not google/cpc.
4. **[Ops] Secondary events.** `start_tell` already fires on the Start click (line 420). Add `chat_started` on the visitor's first sent answer and `chat_ready` when the host hands over (`[[READY]]`). Import `chat_started` into Google Ads as a secondary (observation only) conversion so a small test has something to count.
5. **[Ops] Meta pixel** with `ViewContent`, `chat_started` (custom) and `Purchase`, only if the Meta test in section F runs. The page has no Meta pixel and no Ads tag today.
6. **[Brew] Privacy page** currently says only "We use Google Analytics to count visits". Adding a Google Ads tag or Meta pixel needs a line in Privacy and the /tell footer.

### The product must survive a paid stranger (red team #8, #9)

7. **[Ops] One real paid test, end to end.** The live test (2026-11-01) stopped before paying: the paid message, refresh, the saved-session restore and the statement suffix are untested. Pay once, refresh, close and reopen the tab, confirm the message comes back. Privacy promises "you can reload it" (line 56); that promise must be true before strangers pay.
8. **[Ops] "Start another pet" asks before discarding** (`location.reload()` at line 575 today). A paid message must never vanish on one tap.
9. **[Brew] Stripe checkout shows Carnivore Weekly** (tab title, logo, "Pay securely at Carnivore Weekly", live test issue 3). A stranger from an ad who meets a different brand at the card form is the classic abandon or chargeback moment. Needs Brew's call on Stripe branding or a separate account.
10. **[Ops] Apple Pay and Link missing on the /tell checkout** (live test issue 4) while the Bridge checkout shows them. Most paid clicks will be on phones.

### The landing page must show the product first (red team #1, #4, #5, #6, #7)

11. **[Brew] Keyword-echo variants of /tell**: `/tell?pet=dog` and `/tell?pet=cat`. Same page, three swapped strings. Proposed copy:
    - Kicker: What they'd tell you
    - H1 (dog): What would your dog say? / (cat): What would your cat say?
    - Lede: Tell a friendly host about your dog. You get a funny message in their own voice, made with AI from your stories, plus a card made for sharing.
    - Price line under Start: The chat is free. The message is $9.99 USD.
12. **[Brew] Sample above the fold**, between the lede and Start, on both variants and on plain /tell. Ideally the real card image the product makes (1080 by 1350, line 666), produced by running the sample intake through the live product. Label it plainly:
    - Dog: "The microwave beeps, I answer. That's just good manners." Caption: Sample message from Waffles, a made-up beagle who howls at the microwave.
    - Cat: "I don't need anyone. I just need you at the sink every morning." Caption: Sample message from Duchess, a made-up tabby who sits in the bathroom sink.
    - Give the sample block `id="sample"` and the steps list `id="how"` so the sitelinks below can point at them.
13. **[Brew] Remove the free-retry footer line** on /tell ("try again free from your reading"). Replace with: Refunds: email hello@mylittleshadow.com within 30 days of purchase, handled within 24 hours. The retry stays only inside the paid message's under-3-stars flow.
14. **[Brew] One trust line only.** The line under Start and under "Hear from them, $9.99" both say "you get your money back". Keep the refund wording once on the page (footer, as in 13) so it reads as a fact, not a worry.
15. **[Brew] Drop "reading" on the paid path.** /tell price line ("Their reading is $9.99 USD") and the article CTAs ("Start their reading") become "message". Article titles say "9 dog habits, translated" and "A translation guide"; retitle to "explained" before they are used as sitelinks (section E).
16. **[Brew] No Rainbow Bridge link on paid variants.** Hide the footer link to The Rainbow Bridge when `pet=` is present or `utm_medium` is cpc or paid_social. The host's grief hand-off in chat stays (it already works, live test check 6). No paid link to the home page.
17. **[Ops] Voice off by default.** `voiceOn = true` (line 321). Start silent; show "Voice off" with a clear tap to turn on. Keep "Hear it out loud" on the finished message, which is the right moment for sound.
18. **[Brew] Business identity on Contact** (red team section 5, Misrepresentation scrutiny for thin new advertisers): a business name and country at minimum.
19. **[Ops] Schema fix** on /tell: `MerchantReturnPolicy` lists `applicableCountry: "CA"` only and `FreeReturn` for a digital item (red team section 5).
20. **[Brew] Privacy line 56** mentions "your free retry". Rewrite without promoting it, same rule as 13.

Gate: 1 to 4, 7, 8, 11 to 13 and 16 are the hard minimum for Google. Add 5 and 6 for Meta. 9 is the one most likely to cost sales if skipped.

---

## C. Channel call and test design

### What the first test buys

- **Meta/Instagram first, Google Search second and small.** The product is novel, visual and shareable; nobody searches for it by name. Search captures demand, Meta creates it (research section 3, agency opinion, not measured). Search intent on the closest phrases is mostly curiosity, memes, books and free apps (research section 1). The red team reaches the same call (section 6).
- **Search runs as a tight probe:** exact match on the phrases closest to the output, two ad groups, a hard CPC cap. Its job is to answer one question: does any search query buy at all?
- **The first budget buys learning, not profit.** Neither platform exits learning on purchases at a small budget (research section 3: Google tROAS needs 15 conversions in 30 days; Meta commonly about 50 events a week). So Meta optimises for `chat_started` and is judged on purchases.
- Suggested split, if Brew wants one: about two thirds Meta, one third Search. Amount: Brew's call.

### Break-even math

Revenue per sale: $9.99 USD minus Stripe (about 2.9% plus $0.30, so about $0.59) minus model and voice costs (not measured; red team estimate) leaves **about $9.00**. Break-even cost per click = $9.00 times the click-to-purchase rate.

| Click to purchase | Break-even CPC | Clicks per sale |
|---|---|---|
| 1% | $0.09 | 100 |
| 2% | $0.18 | 50 |
| 3% | $0.27 | 33 |

Benchmarks for comparison (research section 3, third-party): Google Search, Animals & Pets, about $3.97 to $4.06 per click, which would need a 44 to 45 percent purchase rate to break even. Meta, Pets & Animals, about $0.76 to $1.12 per click, which needs about 8 to 12 percent. Neither is likely at launch. That is why the test is for learning and why the share card matters: every card shared carries `utm_source=card_share` (line 590), so watch that row as the free second click.

### Kill rules (thresholds are Hazel's judgement, change freely)

1. **Per keyword or Meta ad:** pause at $18 spend (two break-even sales) with zero purchases.
2. **Search CPC:** manual CPC with a cap of $0.27 (break-even at 3%). Low impression share is expected and fine. Any keyword whose average CPC sits above $0.45 (break-even at 5%) after 10 clicks: pause.
3. **Funnel check:** after 50 paid landing sessions on a channel, if fewer than 20% send a first answer (`chat_started`), stop buying clicks; the page is the problem, not the ad.
4. **Campaign stop:** at half of Brew's test budget with zero purchases across both channels, stop and fix the funnel before spending the second half.
5. **Keep signal:** any keyword or ad at or under $9 per purchase over 5 or more purchases stays on and gets budget.
6. Review Search terms after day 3 and day 7; add every mismatch to the negatives.

---

## D. Google Search campaign

Settings: campaign `tell_search`. Search only (Display off, Search Partners off). US and Canada, "Presence" location option. English. Manual CPC, cap $0.27 (section C). All devices and hours; watch late-night mobile. Ads unpinned.

### Ad group: dog

Exact match:
- [what would my dog say]
- [what my dog would say]
- [what would my dog say to me]
- [what would my dog say if he could talk]
- [what would my dog say if she could talk]
- [message from my dog]
- [letter from my dog]
- [funny message from my dog]
- [funny things my dog would say]

Phrase match (second step, add only after a week of clean search terms on exact):
- "what would my dog say"
- "message from my dog"
- "letter from my dog"
- "my dog's personality in words"

Ad group negatives: cat, cats, kitten, kitty (keeps cat searches in the cat group).

Final URL: `https://mylittleshadow.com/tell?pet=dog&utm_source=google&utm_medium=cpc&utm_campaign=tell_search&utm_content=dog` (variant to build, blocker 11; until then `/tell` with the same tags).
Display path: `your-dog` (8) / `says` (4), shown as mylittleshadow.com/your-dog/says

### Ad group: cat

Exact match:
- [what would my cat say]
- [what my cat would say]
- [what would my cat say to me]
- [what would my cat say if she could talk]
- [what would my cat say if he could talk]
- [message from my cat]
- [letter from my cat]
- [funny message from my cat]
- [funny things my cat would say]

Phrase match (second step, same rule):
- "what would my cat say"
- "message from my cat"
- "letter from my cat"
- "my cat's personality in words"

Ad group negatives: dog, dogs, puppy, pup.

Final URL: `https://mylittleshadow.com/tell?pet=cat&utm_source=google&utm_medium=cpc&utm_campaign=tell_search&utm_content=cat` (variant to build).
Display path: `your-cat` (8) / `says` (4)

### Held back at launch, with the reason

| Keyword | Why not now |
|---|---|
| what is my dog / cat thinking | Behaviour research intent (red team section 2). |
| if my dog / cat could talk | Books, listicles, memes (research section 1). |
| dog translator, pet translator | The ad cannot answer it honestly without echoing "translate" (rule 3). Revisit only if exact terms convert. |
| what my cat thinks of me | Implies "what they really think" (rule 3). |
| dog roast | The output is loving, not a roast; expectation mismatch. |
| what would my pet say | No pet-neutral ad group; add one only if dog and cat work. |
| gift for dog / cat owner, custom pet card | Physical-gift intent, priciest weeks of the year, and the buyer must know the pet well. Revisit for December with a gift page. |
| pet / dog personality test | Free quiz intent. |
| talking pet app, pet talk app, dog voice app | Kids and app seekers; Terms require 18+. |

### Negative keywords (campaign level, one per line)

Changes from the old draft: **removed** `toy` (blocked every toy breed), `free` (the ad now states free chat and $9.99 together), `medium` (blocked "medium sized dog"). Replaced by narrower terms below. **Kept** `translator` and `translate` on purpose (rule 3), reviewed after week one.

```
toys
"talking toy"
plush
"free app"
"free online"
"free download"
app
apps
download
apk
"app store"
"play store"
game
games
kids
kid
children
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
gif
quotes
generator
chatgpt
"why does"
"body language"
signs
"how to tell"
meaning
science
study
research
behavior
behaviour
translator
translate
device
collar
button
buttons
board
training
trainer
psychic
"pet medium"
"animal medium"
communicator
"animal communication"
telepathy
tarot
horoscope
astrology
"mind reading"
"mind reader"
death
died
dead
die
dying
passed
"passed away"
loss
grief
grieving
memorial
"in memory"
remembrance
"rainbow bridge"
heaven
afterlife
euthanasia
"put down"
sympathy
vet
sick
symptoms
pain
illness
book
books
song
lyrics
movie
poem
print
printed
canvas
painting
portrait
frame
ornament
blanket
pillow
socks
mug
shirt
"greeting card"
personalized
amazon
etsy
jobs
job
career
hiring
salary
```

Notes: `socks` and `personalized` block physical-gift shopping; neither appears in the exact keywords. `"rainbow bridge"` is a negative only, so no grieving person reaches a joke page from an ad.

---

## E. The ads

Rules applied to every asset: stands alone in any combination, has a noun (dog, cat, message, card), never "reading", never mind reading or translation, never the free retry. "Free" appears only inside an asset that also says $9.99 USD. AI is said plainly in a headline and a description. One trust asset only, and it is a callout, not a headline.

### RSA: dog ad group

Headlines:
1. `What would your dog say?` (24)
2. `A funny message from your dog` (29)
3. `Like a letter from your dog` (27)
4. `Your dog's side of the story` (28)
5. `Your dog, in their own words` (28)
6. `Your dog on sock theft` (22)
7. `Your dog on the couch rules` (27)
8. `Your dog's take on 3 questions` (30)
9. `Made with AI from your stories` (30)
10. `Your dog's message, read aloud` (30)
11. `Your dog's line, on a card` (26)
12. `Free chat, then $9.99 USD` (25)
13. `$9.99 USD, share card included` (30)
14. `Start your dog's message` (24)
15. `Make one about your dog` (23)

Descriptions:
1. `Tell a friendly host about your dog. Get a funny message in their own voice. Start now.` (87)
2. `Sample, Waffles the beagle: "The microwave beeps, I answer. That's just good manners."` (86)
3. `Made with AI from your stories: the habits, the crimes, the couch spot that is theirs.` (86)
4. `Free chat, then $9.99 USD for the message, a share card and an optional read-aloud.` (83)

Worst-case combinations checked: "Your dog on sock theft | Free chat, then $9.99 USD" (product, animal, price), "Made with AI from your stories | Make one about your dog" (honest, clear call to action), "Your dog's line, on a card | Like a letter from your dog" (what you get). No combination is pronoun-only, refund-only or about another animal.

### RSA: cat ad group

Headlines:
1. `What would your cat say?` (24)
2. `A funny message from your cat` (29)
3. `Like a letter from your cat` (27)
4. `Your cat's side of the story` (28)
5. `Your cat, in their own words` (28)
6. `Your cat on knocking stuff off` (30)
7. `Your cat on the 3 a.m. sprints` (30)
8. `Your cat's take on 3 questions` (30)
9. `Made with AI from your stories` (30)
10. `Your cat's message, read aloud` (30)
11. `Your cat's line, on a card` (26)
12. `Free chat, then $9.99 USD` (25)
13. `$9.99 USD, share card included` (30)
14. `Start your cat's message` (24)
15. `Make one about your cat` (23)

Descriptions:
1. `Tell a friendly host about your cat. Get a funny message in their own voice. Start now.` (87)
2. `Sample, Duchess the cat: "I don't need anyone. I just need you at the sink every morning."` (90)
3. `Made with AI from your stories: the habits, the crimes, the chair that is no longer yours.` (90)
4. `Free chat, then $9.99 USD for the message, a share card and an optional read-aloud.` (83)

Sample lines are verbatim `cardLine` values from the made-up sample pets in `2026-10-31-what-theyd-tell-you-prompts.md`, and each is labelled "Sample".

### Sitelinks (ad group level, four each)

Dog group:

| Text | Line 1 | Line 2 | Final URL | Status |
|---|---|---|---|---|
| `See a sample message` (20) | `Waffles the beagle, a sample` (28) | `Made from a made-up dog` (23) | /tell?pet=dog#sample | To build (blocker 12) |
| `How it works` (12) | `A short chat about your dog` (27) | `Then $9.99 USD for the message` (30) | /tell?pet=dog#how | To build (anchor only) |
| `Dog habits, explained` (21) | `Head tilts, socks, zoomies` (26) | `In a dog's own cheeky words` (27) | /what-would-my-dog-say | Exists; retitle first (blocker 15) |
| `Questions to ask your dog` (25) | `If they could talk, start here` (30) | `Plus the answers they'd give` (28) | /questions-to-ask-your-dog | Exists |

Cat group:

| Text | Line 1 | Line 2 | Final URL | Status |
|---|---|---|---|---|
| `See a sample message` (20) | `Duchess the cat, a sample` (25) | `Made from a made-up cat` (23) | /tell?pet=cat#sample | To build |
| `How it works` (12) | `A short chat about your cat` (27) | `Then $9.99 USD for the message` (30) | /tell?pet=cat#how | To build (anchor only) |
| `Cat habits, explained` (21) | `Boxes, biscuits, 3 a.m. laps` (28) | `In a cat's own smug words` (25) | /what-is-my-cat-thinking | Exists; retitle first |
| `Questions to ask your cat` (25) | `If they could talk, start here` (30) | `Plus the answers they'd give` (28) | /questions-to-ask-your-dog | Exists (page covers cats; add `#cat` anchor) |

Every sitelink URL gets `utm_source=google&utm_medium=cpc&utm_campaign=tell_search&utm_content=sl_<name>`. Dropped from the old draft: the home page (ends in the Bridge), Terms as "Money-back promise", Privacy.

### Callouts (campaign level)

- `Made with AI` (12)
- `Built from your stories` (23)
- `Optional photo` (14)
- `Optional read-aloud` (19)
- `Share card included` (19)
- `No account needed` (17)
- `Photos never stored` (19)
- `Refund by email, 30 days` (24) (the one trust asset in the whole ad set)

### Structured snippet (campaign level)

Header: Service catalog
- `Funny message` (13)
- `Answers to 3 questions` (22)
- `Share card` (10)
- `Read-aloud version` (18)

No price asset: it needs at least 3 items and there is one product (research section 5). No promotion asset.

---

## F. Meta/Instagram test

Setup: Sales objective optimising for the `chat_started` custom conversion (more events than purchases; judged on `Purchase`). US and Canada, age 18+ (Terms), broad or Advantage+ audience. Placements: Instagram feed, Reels, Stories; Facebook feed. One ad set, three ads below. Final URL: `/tell?pet=dog` or `?pet=cat` with `utm_source=meta&utm_medium=paid_social&utm_campaign=tell_meta&utm_content=v1` (v2, v3). Button: Learn more.

**Creative rule (Brew's mockup rule):** only real product output. No AI-generated images of the product, the card, a phone or a pet. Make the creative by running the sample intake (Waffles, Duchess, Clementine) through the live /tell and capturing the real card PNG and a real screen recording. If a pet photo appears on a card, it must be a real pet photographed with the owner's permission, and the card line must come from that pet's own run; otherwise use the card without a photo.

### Variant 1: the dog sample

- Primary text: Waffles the beagle howls every time the microwave beeps, so we let him explain himself. "The microwave beeps, I answer. That's just good manners." That is a sample, made from a made-up beagle. Tell a friendly host about your dog and get a funny message in their own voice, plus a card for the group chat. Made with AI from your stories. Free chat, then $9.99 USD.
- Headline: What would your dog say?
- Description: A funny message in their own voice
- Creative: the real 1080 by 1350 card the product made from the Waffles intake, shown as is. Small caption on the post, not on the card: Sample.

### Variant 2: the cat sample

- Primary text: Duchess sits in the bathroom sink every morning and would like it known she needs no one. "I don't need anyone. I just need you at the sink every morning." Sample message, made from a made-up tabby. Your cat has their own version. Tell a friendly host about them and get a funny message in their voice, plus a card made for sharing. Made with AI from your stories. Free chat, then $9.99 USD.
- Headline: What would your cat say?
- Description: The sink is hers. Ask yours.
- Creative: the real Duchess card from the product.

### Variant 3: the questions (video)

- Primary text: Everyone has a question for their pet. Why the charger? Why the socks? Here is a sample answer from Clementine, a made-up rabbit: "It was long, it was on my floor, and it kept stealing your attention from me. I solved two problems at once. You're welcome." Ask yours up to three questions and get a funny message in their voice. Made with AI from your stories. Free chat, then $9.99 USD.
- Headline: Ask your pet three questions
- Description: Answered in their own voice
- Creative: a 9:16 screen recording of the real /tell flow on a phone, sped up: three typed answers, the hand-off, the finished message scrolling, the card. Soundtrack: the product's own "Hear it out loud" narration of that sample. Burned-in caption at the start: Sample. Made with AI. Final URL for this one: plain `/tell` (dogs, cats and rabbits).

Meta labels some AI-made ad media automatically (research section 4); these creatives are product screenshots, and the copy says AI anyway.

---

## G. Self-check

### Red team Top 10

| # | Red team problem | How this plan answers it |
|---|---|---|
| 1 | Ads never show the product | Sample lines in description 2 of both RSAs and in all three Meta ads; payoff headlines (sock theft, couch rules, 3 a.m. sprints, line on a card); no "microphone", "get a word in" or pronoun-only headlines; calls to action in H14, H15 and D1. |
| 2 | Blind bidding, impossible economics | Blockers 1 to 4 (Ads conversion, auto-tagging, Stripe referral, chat events); break-even table; manual CPC cap $0.27; kill rules; test framed as learning. |
| 3 | Keywords aimed at curiosity, kids, gifts | Gift, test, app, thinking and "could talk" keywords held with reasons; exact match first; dog and cat split; negatives rebuilt (kids, games, meme, quiz-like, behaviour, physical gifts added; toy, free, medium narrowed). |
| 4 | Page shows nothing before minutes of typing | Blockers 11 and 12: keyword-echo hero per animal and a real card sample above the fold; price stated in the hero. |
| 5 | Free retry promoted everywhere | Absent from every ad, sitelink, callout and Meta ad; blockers 13 and 20 remove it from /tell footer and Privacy. |
| 6 | Defensive, contradictory trust copy | No "not mind reading", no "built from what you tell us" as a disclaimer, one trust asset (a callout); blocker 14 trims the page to one refund line. Home page overclaims are avoided by not linking it. |
| 7 | Paid traffic routed to the medium product | No home page sitelink; blocker 16 hides the Bridge link on paid variants; "reading" removed from ads and the paid path (blocker 15); grief terms negated. |
| 8 | Paid messages can vanish | Blockers 7 and 8: one real paid end-to-end test including refresh, and a confirm before "Start another pet". |
| 9 | "Money back" in ads, email-only on page | The one trust asset says exactly "Refund by email, 30 days", matching Terms and the decision of 2026-10-31. |
| 10 | Sitelinks, structure, housekeeping | Four useful sitelinks per group (sample, how it works, habits article, questions article); dog and cat split; AI said in headline 9, description 3, callout and every Meta ad; voice off by default (17); Contact identity (18); schema fix (19). USD stated in every price asset. |

### Brew's rules

| Rule | Result | Evidence |
|---|---|---|
| 1. Never promote the free retry | Pass | Zero mentions in sections D, E, F. Mentioned only in blockers 13 and 20, which remove it. |
| 2. Money-back secondary, max one asset, truthful | Pass | One callout, `Refund by email, 30 days`. Not in headlines, descriptions, sitelinks or Meta copy. |
| 3. No psychic, mind reading, translation, "what they really think", no "reading" in ad text | Pass | Ad assets use message, letter, card. "translate", "psychic", "mind reading" appear only as negative keywords. "What my cat thinks of me" and "dog translator" held back for this rule. |
| 4. No Rainbow Bridge, death, grief, memorial in paid | Pass | Appear only as negative keywords; blocker 16 removes the Bridge footer link on paid variants; no home page link. |
| 5. No invented reviews, counts, ratings, stats | Pass | No social proof claimed. Sample lines are verbatim from the made-up sample pets and labelled "Sample". Benchmark numbers in section C are cited to the research file and marked third-party. |
| 6. No em dashes | Pass | Checked with grep on the saved file: zero. |
| 7. AI said plainly | Pass | Headline 9 and description 3 (both RSAs), callout `Made with AI`, every Meta primary text, blocker 11 hero lede. |
| 8. "Free" only with $9.99 in the same unit | Pass | Headline 12 and description 4 each carry both in one asset; every Meta primary text carries both; no other ad asset says free. |

---

## H. Reddit r/googleads advice (to fold in)

(Empty on purpose. A later pass adds advice from r/googleads here and adjusts sections C to E.)
