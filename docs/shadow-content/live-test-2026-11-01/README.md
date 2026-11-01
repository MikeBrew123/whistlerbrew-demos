# Live test: mylittleshadow.com/tell and /bridge checkout

Date: 2026-11-01, Chrome, `?bust=110101` to `110103`. No payment made.

| # | Check | Result | Screenshot |
|---|---|---|---|
| 1 | /tell loads, Start opens the chat | Pass. Host greets and asks name and kind of animal. | |
| 2 | Real chat (Biscuit, yellow lab) | Pass. Real Claude replies, playful, picks up details (socks, toast). | 1-tell-photo-chat.jpg |
| 3 | Photo upload | Pass. Photo shows in the chat; the host describes it (stance, tail, head turn). | 1-tell-photo-chat.jpg |
| 4 | Full interview to the buy button | Pass. Five questions, then "Hear from them, $9.99" with "If it doesn't sound like them, you get your money back." | 2-tell-buy-button.jpg |
| 5 | Stripe Checkout for /tell | Pass. Live session, "My Little Shadow", "What they'd tell you", $9.99. Stopped before paying. | 3-tell-stripe-9.99.jpg |
| 6 | Grief hand-off (fresh chat: "She died last week") | Pass. Host drops the jokes, says sorry, names The Rainbow Bridge on this site, no pressure. | 4-tell-death-handoff.jpg |
| 7 | Stripe Checkout for /bridge | Pass. "The Rainbow Bridge", "Rainbow Bridge Reading", $14.99. Stopped before paying. | 5-bridge-stripe-14.99.jpg |

## Issues seen

1. The /tell footer still says "try again free from your reading" (Brew's rule: never promote the free retry). Needs a copy change, Brew's approval.
2. Grief hand-off names The Rainbow Bridge but gives no link in the chat; the only link is in the footer. A tappable link after the hand-off message would help.
3. Both checkouts still show Carnivore Weekly: browser tab title "Carnivore Weekly", the CW logo, and the Link line "Pay securely at Carnivore Weekly". Known gap (decision 2026-10-31, shared Stripe account).
4. /tell checkout showed no Apple Pay or Link buttons; /bridge checkout showed both. Same browser, minutes apart. Worth a look in the session settings, since Apple Pay matters on phones.
5. Voice is on by default; the page speaks as soon as Start is clicked.

Not tested: a real payment, the paid reading, the KV purchase record, the refresh fix, and the LITTLE SHADOW statement suffix.
