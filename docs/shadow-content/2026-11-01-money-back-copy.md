# Money-back, feedback and maintenance copy (2026-11-01)

Writer: Hazel. For the main session to place. No site file was edited.

Built on Brew's decisions of 2026-11-01:
- The free retry is not offered or mentioned anywhere in public copy or the product. It exists only as support's first offer when someone emails.
- The money-back process, stated the same way everywhere: email hello@mylittleshadow.com within 30 days and tell us what missed; we offer to make a new one with new answers; if you'd rather not, we refund in full; we reply within 24 hours.
- The medium act on /bridge and the home page's Bridge description stay as they are. Nothing below touches them.
- Data facts: photos and voice go to our AI providers to make the reading and are not stored by us; a paid reading's text is kept with the purchase for up to 60 days so it can be shown again on the same device; star ratings are kept; a written note, and the reading only if the box is ticked (unticked by default), are kept for up to 12 months to improve the prompts; Google Analytics counts visits; payments go through Stripe.

Where the code already has a placeholder, the key below matches it exactly. Every string in B, C and D is plain text with no double quotes, no backticks and no HTML, so it can drop straight into a JS or TS string.

---

## A. Money-back lines

### MONEY_BACK_SHORT (daylight and neutral)
For /tell, the guides, the tell checkout description and JSON-LD.

```text
Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

### MONEY_BACK_SHORT_CANDLE (candlelight)
For /bridge, the Bridge checkout description and JSON-LD. Same promise, softer door.

```text
If it doesn't feel right, write to hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

### Footer forms (same words, with the mailto link)
/tell footer:
```text
<br>Our promise: if a reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```
/bridge footer:
```text
<br>Our promise: if a reading doesn't feel right, write to <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

### MONEY_BACK_LABEL (only where a sentence won't fit)
For the home page promise strip and the small line under the home page's Light a candle button. It points to the process; it never replaces it on a page where money is taken.

```text
Money back within 30 days
```

### MONEY_BACK_FULL (Terms and Contact)
Plain text:
```text
If a paid reading isn't right for you, email hello@mylittleshadow.com within 30 days of purchase and tell us in a few words what missed. Knowing why helps us make every reading better. We'll offer to make you a new one with new answers, and if you'd rather not, we'll refund you in full. We reply within 24 hours.
```
HTML, ready for Terms and Contact:
```text
<p>If a paid reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days of purchase and tell us in a few words what missed. Knowing why helps us make every reading better. We'll offer to make you a new one with new answers, and if you'd rather not, we'll refund you in full. We reply within 24 hours.</p>
```

Privacy does not repeat the money-back promise. Its only link to refunds was the "use your free retry, or ask us for a refund" line, which is replaced in E below.

Not included on purpose (Brew said "nothing more"): the old Terms line "Refunds go back to the card you paid with and can take 5 to 10 days to arrive." It is true of Stripe, and useful, but it is an extra statement. Brew's call whether Terms keeps it.

---

## B. LOW_RATING_THANKS

Shown after someone rates under 3 stars and sends what missed. There is no retry button. These replace the code placeholders `{{LOW_THANKS_TELL}}` (`public/shadow/tell.html`) and `{{LOW_THANKS_BRIDGE}}` (`public/bridge/index.html`).

### LOW_THANKS_TELL (daylight)
```text
Thanks for being honest. It really does help us get the next pet right. If this one wasn't right for you, email hello@mylittleshadow.com within 30 days. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

### LOW_THANKS_BRIDGE (candlelight)
```text
Thank you for telling us. What you shared will help the next person who lights a candle. If this reading wasn't right for you, write to hello@mylittleshadow.com within 30 days. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

### FEEDBACK_NOTE (both pages, new small line)
Goes under the "Include this reading so we can see what missed" checkbox, inside the under-3-stars box, on /tell and /bridge. Keep the checkbox label as it is; this line says what happens to what they send.

```text
We keep your note, and the reading if you include it, for up to 12 months to make readings better.
```

---

## C. MAINTENANCE (our AI is down)

Shown on the page (the note under the disabled Start button or candle) and in the chat. Checkout is blocked while the site is marked down (`startCheckout` returns the down message), so "nobody will be charged" is true.

### MAINT_TELL (daylight)
Replaces `{{MAINT_TELL}}` in `public/shadow/tell.html` and `src/app/api/bridge/route.ts`.
```text
We're fixing something on our end, so the microphone is off for now. Please come back soon. Checkout is paused while we fix it, so nobody will be charged.
```

### MAINT_BRIDGE (candlelight)
Replaces `{{MAINT_BRIDGE}}` in `public/bridge/index.html` and `src/app/api/bridge/route.ts`.
```text
We're mending something on our side, so the candle is dim for now. Please come back soon. Checkout is paused while we mend it, so no one will be charged.
```

---

## D. MAINTENANCE_PAID (already paid, reading can't be made now)

True today: the paid session is remembered on that device for 60 days, and the start screen offers "Finish the reading you paid for" when they return.

### MAINT_PAID_TELL (daylight)
Replaces `{{MAINT_PAID_TELL}}` in `src/app/api/bridge/route.ts`.
```text
We're fixing something on our end, so their reading can't be written just now. Your purchase is safe. Come back to this page later on this device to finish it, or email hello@mylittleshadow.com and we'll help.
```

### MAINT_PAID_BRIDGE (candlelight)
Replaces `{{MAINT_PAID_BRIDGE}}` in `src/app/api/bridge/route.ts`.
```text
We're mending something on our side, so their reading can't come through just now. Your purchase is safe. Return to this page later on this device to receive it, or write to hello@mylittleshadow.com and we'll help.
```

---

## E. Replacement table

Line numbers are as of this draft (the code was changing while I wrote it). Match on the exact text, not the number. "Current" is copied from the file character for character. "Substring" means replace just that text inside the line; "whole line" means replace the whole line, leading spaces aside.

Already gone from the code, so no entry: the "Try again with new answers, free" buttons, the pre-ticked checkbox, "Thanks for telling us. We're on it.", "Thank you for telling us. We're listening.", "Your refund is on its way...", and the route.ts "Your free retry has already been used." and "Refunds are by email..." errors. Two code comments in `route.ts` still describe the retry (lines 13 and 214). Customers never see them, but the developer may want to tidy them.

Left as they are on purpose: Terms meta description ("including our money-back guarantee"), Terms heading "Our guarantee", Contact's "refunds" bullet and meta description, Privacy "We don't keep chat transcripts, photos or voice recordings.", Privacy Photos and Voice sections (already say we don't store them, and the AI companies section covers their handling), /tell "We use it for your reading and your card, then let it go." and the home page "Any photo works..." line. All are true under today's facts.


### Home page (daylight above the dusk, candlelight in the night section)

**E1. `public/shadow/index.html:304`** (substring of the line). Candlelight card under Light a candle. MONEY_BACK_LABEL form; the full process lives on Terms.

Current:
```text
$14.99, with a money-back guarantee
```
Replace with:
```text
$14.99 USD, and money back within 30 days if it isn't right for you
```

**E2. `public/shadow/index.html:314`** (substring of the line). Promise strip label. Optional: wrap in a link to /terms.

Current:
```text
Money-back guarantee</li>
```
Replace with:
```text
Money back within 30 days</li>
```

**E3. `public/shadow/index.html:317`** (substring of the line). X4: we don't store them; the AI providers' own handling is on Privacy.

Current:
```text
Photos never stored</li>
```
Replace with:
```text
We don't keep your photos</li>
```


### What they'd tell you (daylight)

**E4. `public/shadow/tell.html:200`** (substring of the line). Product JSON-LD description.

Current:
```text
Money back if it doesn't sound like them.
```
Replace with:
```text
Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E5. `public/shadow/tell.html:245`** (substring of the line). Intro, under Start.

Current:
```text
The chat is free. Their reading is $9.99 USD, and if it doesn't sound like them, you get your money back.
```
Replace with:
```text
The chat is free. Their reading is $9.99 USD. Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E6. `public/shadow/tell.html:269`** (substring of the line). Under the buy button. Replace the intro line above first (different case, but be safe).

Current:
```text
If it doesn't sound like them, you get your money back.
```
Replace with:
```text
Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E7. `public/shadow/tell.html:277`** (substring of the line). Footer.

Current:
```text
Your photo and voice are never stored; feedback you choose to send is kept so we can improve.
```
Replace with:
```text
We don't keep your photo or voice. Your star rating is kept, and any note you choose to send is kept for up to 12 months so we can improve.
```

**E8. `public/shadow/tell.html:278`** (whole line). Footer promise line.

Current:
```text
<br>Our promise: if a reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days for a full refund, handled within 24 hours.
```
Replace with:
```text
<br>Our promise: if a reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```


### The Rainbow Bridge (candlelight)

**E9. `public/bridge/index.html:255`** (substring of the line). Product JSON-LD description.

Current:
```text
Money back if it doesn't feel like them.
```
Replace with:
```text
If it doesn't feel right, write to hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E10. `public/bridge/index.html:312`** (substring of the line). Under the buy button.

Current:
```text
If it doesn't feel like them, you get your money back.
```
Replace with:
```text
If it doesn't feel right, write to hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E11. `public/bridge/index.html:320`** (substring of the line). Footer.

Current:
```text
Your photo and voice are never stored; feedback you choose to send is kept so we can improve.
```
Replace with:
```text
We don't keep your photo or voice. Your star rating is kept, and any words you choose to send are kept for up to 12 months so we can improve.
```

**E12. `public/bridge/index.html:322`** (whole line). Footer promise line (B1, X2). Removes the free retry.

Current:
```text
<br>Our promise: if a reading doesn't feel like them, try again free from your reading, or email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days for a full refund, handled within 24 hours.
```
Replace with:
```text
<br>Our promise: if a reading doesn't feel right, write to <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```


### Privacy

**E13. `public/shadow/privacy.html:45`** (substring of the line). Bump with these changes.

Current:
```text
Last updated: October 31, 2026
```
Replace with:
```text
Last updated: November 1, 2026
```

**E14. `public/shadow/privacy.html:52`** (whole line). Short version. One bullet becomes two.

Current:
```text
<li>A paid reading is kept for up to 60 days, so you can come back to it.</li>
```
Replace with:
```text
<li>A paid reading is kept for up to 60 days, so it can be shown to you again on the same device.</li>
<li>Star ratings are kept. A note you write about a reading, and the reading itself if you tick the box, are kept for up to 12 months so we can improve.</li>
```

**E15. `public/shadow/privacy.html:59`** (whole line). P2 and X2: no reload promise, no free retry.

Current:
```text
<p>There is one exception. If you buy a reading, its finished text is kept for up to 60 days. That way you can reload it, use your free retry, or ask us for a refund.</p>
```
Replace with:
```text
<p>There is one exception. If you buy a reading, its finished text is kept with your purchase for up to 60 days, so it can be shown to you again when you come back on the same device and browser.</p>
```

**E16. `public/shadow/privacy.html:69`** (whole line). X1. Matches today's code change: box unticked, reading only if ticked.

Current:
```text
<p>At the end of a reading you can tell us how we did. Your star rating and anything you write about what we got wrong are kept so we can do better. Your reading is included with your feedback only if you leave that box ticked.</p>
```
Replace with:
```text
<p>At the end of a reading you can tell us how we did. Your star rating is kept. If you rate a reading under 3 stars, you can also write a few words about what missed, and tick a box to include the reading itself. The box starts unticked. Your note, and the reading if you included it, are kept for up to 12 months so we can improve how readings are written.</p>
```

**E17. `public/shadow/privacy.html:74`** (substring of the line). No refund event fires any more.

Current:
```text
a card being saved or shared, a rating and a refund.
```
Replace with:
```text
a card being saved or shared, and a rating.
```

**E18. `public/shadow/privacy.html:75`** (whole line). P3. True today: photo goes into sessionStorage at checkout, paid reading into localStorage.

Current:
```text
<p>Your browser also remembers a few things on your own device: whether voice is on or off, whether you tapped the printed-card button, and your conversation while you go through checkout, so you don't lose your place.</p>
```
Replace with:
```text
<p>Your browser also remembers a few things on your own device: whether voice is on or off, whether you tapped the printed-card button, your conversation and photo while you go through checkout, so you don't lose your place, and, if you buy a reading, the reading itself for up to 60 days so you can open it again here.</p>
```


### Terms

**E19. `public/shadow/terms.html:45`** (substring of the line). T8.

Current:
```text
Last updated: October 31, 2026 (What they'd tell you added)
```
Replace with:
```text
Last updated: November 1, 2026
```

**E20. `public/shadow/terms.html:65`** (whole line). Our guarantee, paragraph 1. MONEY_BACK_FULL.

Current:
```text
<p>This applies to every paid reading. If it didn't feel like them, rate it under 3 stars at the end of your reading and tell us in a few words what missed. You'll be offered one free retry with new answers, on us.</p>
```
Replace with:
```text
<p>If a paid reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days of purchase and tell us in a few words what missed. Knowing why helps us make every reading better. We'll offer to make you a new one with new answers, and if you'd rather not, we'll refund you in full. We reply within 24 hours.</p>
```

**E21. `public/shadow/terms.html:66`** (whole line). Our guarantee, paragraph 2. Covered by the new paragraph above.

Current:
```text
<p>If you'd still rather have your money back, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days of purchase and we'll refund you in full. We handle refund requests within 24 hours. Refunds go back to the card you paid with and can take 5 to 10 days to arrive.</p>
```
Replace with:
```text
delete
```

**E22. `public/shadow/terms.html:72`** (substring of the line). End of Our responsibility.

Current:
```text
If a paid reading didn't feel right, our guarantee (a free retry or a full refund) is there for you.
```
Replace with:
```text
If a paid reading isn't right for you, see Our guarantee above.
```


### Contact

**E23. `public/shadow/contact.html:57`** (whole line). Under If a reading didn't feel right. MONEY_BACK_FULL.

Current:
```text
<p>At the end of every paid reading there's a "How did we do?" box. Rate it under 3 stars and tell us in a few words what missed, and you can try again with new answers, free. If you'd still rather have a refund, email us within 30 days of purchase and we'll take care of it within 24 hours.</p>
```
Replace with:
```text
<p>If a paid reading isn't right for you, email <a href="mailto:hello@mylittleshadow.com">hello@mylittleshadow.com</a> within 30 days of purchase and tell us in a few words what missed. Knowing why helps us make every reading better. We'll offer to make you a new one with new answers, and if you'd rather not, we'll refund you in full. We reply within 24 hours.</p>
```


### Checkout text (src/app/api/bridge/route.ts)

**E24. `src/app/api/bridge/route.ts:112`** (substring of the line). Bridge Stripe checkout description.

Current:
```text
A personal reading and keepsake card. If it doesn't feel like them, your money back.
```
Replace with:
```text
A personal reading and keepsake card. If it doesn't feel right, write to hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E25. `src/app/api/bridge/route.ts:144`** (substring of the line). Tell Stripe checkout description.

Current:
```text
A reading in your pet's own voice, plus a card made for sharing. If it doesn't sound like them, your money back.
```
Replace with:
```text
A reading in your pet's own voice, plus a card made for sharing. Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```


### Guides (drafts in docs/shadow-content and the live pages in public/shadow/articles)

**E26.** Guide body and FAQ answers, drafts and live pages (G1). One find-and-replace across all guide files. Found at: `docs/shadow-content/2026-11-01-seo-questions-to-ask-your-pet.md:100`, `docs/shadow-content/2026-11-01-seo-what-is-my-cat-thinking.md:90`, `docs/shadow-content/2026-11-01-seo-what-is-my-cat-thinking.md:103`, `docs/shadow-content/2026-11-01-seo-what-would-my-dog-say.md:90`, `docs/shadow-content/2026-11-01-seo-what-would-my-dog-say.md:103`, `public/shadow/articles/questions-to-ask-your-dog.html:160`, `public/shadow/articles/what-is-my-cat-thinking.html:106`, `public/shadow/articles/what-is-my-cat-thinking.html:157`, `public/shadow/articles/what-is-my-cat-thinking.html:162`, `public/shadow/articles/what-would-my-dog-say.html:106`, `public/shadow/articles/what-would-my-dog-say.html:157`, `public/shadow/articles/what-would-my-dog-say.html:162`

Current (substring, same in every file):
```text
If it isn't right for you, email hello@mylittleshadow.com within 30 days for a full refund.
```
Replace with:
```text
Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```

**E27.** Cat guide FAQ (X4). Found at: `docs/shadow-content/2026-11-01-seo-what-is-my-cat-thinking.md:103`, `public/shadow/articles/what-is-my-cat-thinking.html:106`, `public/shadow/articles/what-is-my-cat-thinking.html:162`

Current (substring, same in every file):
```text
A photo is optional and never stored.
```
Replace with:
```text
A photo is optional, and we don't keep it.
```

**E28.** Guide CTA boxes (G1, X7). Found at: `public/shadow/articles/questions-to-ask-your-dog.html:169`, `public/shadow/articles/what-is-my-cat-thinking.html:166`, `public/shadow/articles/what-would-my-dog-say.html:166`

Current (substring, same in every file):
```text
$9.99, and your money back if it doesn't sound like them.
```
Replace with:
```text
$9.99 USD. Not right for you? Email hello@mylittleshadow.com within 30 days and tell us what missed. We'll reply within 24 hours and offer to make a new reading, or refund you in full if you'd rather.
```


---

## Self-check
- Em dashes and en dashes: zero (checked by script).
- No free retry in any public line. The offer of a new reading appears only as part of the email process, as Brew set it.
- Same promise on every surface: short (daylight or candlelight opener, identical process), footer form, full form, and the label only where a sentence won't fit.
- No invented numbers. Only 30 days, 24 hours, 60 days, 12 months, $9.99 USD and $14.99 USD.
- Medium act untouched on /bridge and the home page.
