# Pushup Challenge — Current Status
_Last updated: 2026-03-01_

## Live URL
https://whistlerbrew.com/pushup/index.html

## ⚠️ DATA WARNING
**Real participants are using this app.** People have registered names, halls, and logged pushups into the Google Sheet. Never wipe or modify the sheet during development. Always test logic changes against the live data carefully before deploying.

## Architecture

### Frontend
- **Source:** `/Users/mbrew/Developer/whistlerbrew-demos/pushup/pushup-challenge.html`
- **Deployed copy:** `/Users/mbrew/Developer/whistlerbrew-demos/public/pushup/index.html`
- **Deploy method:** `cp pushup/pushup-challenge.html public/pushup/index.html && git add ... && git commit && git push`
- **Hosting:** Vercel auto-deploy from GitHub `main` (takes 2-3 min, CDN cache requires `?bust=NNNNN` param to verify)
- Single HTML file — all CSS, HTML, JS inline

### Backend (Google Apps Script)
- **Source:** `/Users/mbrew/Developer/whistlerbrew-demos/pushup/google-apps-script.js`
- **clasp project:** `/tmp/pushup-apps-script/Code.gs`
- **Script ID:** `1oHUsTbTsJBZJvydHVfqip1d87uWlFnLEBOJkciyQ8ohRCQQvNN9bEJ7j`
- **Deployment ID:** `AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg`
- **Current version:** @10
- **Deploy method:**
  ```bash
  cp pushup/google-apps-script.js /tmp/pushup-apps-script/Code.gs
  cd /tmp/pushup-apps-script
  clasp push
  clasp deploy -i AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg
  ```
- **API base URL:** `https://script.google.com/macros/s/AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg/exec`
- **Auth:** ANYONE_ANONYMOUS (no credentials needed, no Content-Type header on requests)

### Apps Script Endpoints (`action=...`)
| Action | Description |
|--------|-------------|
| `register` | Register new participant |
| `login` | Login by participant ID |
| `log` | Log pushups for a date |
| `leaderboard` | Individual + hall rankings |
| `chirps` | 5-8 personalised ticker messages |

## Feature Status

### ✅ Live Features
- **Welcome screen** — returning user dropdown (primary), new registration (secondary/hidden)
- **Dashboard** — two-column layout: SVG ring + stats left, log form right
- **SVG progress ring** — fills based on today's logged vs target; shows count + %
- **Stats row** — Target / Total Done / Bank (green/red) / Leaderboard Rank
- **Log button** — context-aware: red "+ Add to Today" (below target), green "+ Add to Your Bank" (goal met or no target)
- **March calendar** — shows scheduled targets and logged amounts per day
- **Chirp ticker** — scrolling personalised messages, type-specific emojis (🔥😂🎆👎)
- **Individual leaderboard** — 🥇🥈🥉 medals, filtered to active (>0 pushups) only
- **Fire Hall leaderboard** — 🏆🥈🥉 trophy, ranked by avg bank per member
- **Hall ranking subtitle** — explains avg bank metric

## Key JS Functions
| Function | Purpose |
|----------|---------|
| `showWelcome()` | Welcome screen — shows returning or reg form based on participant count |
| `toggleRegForm()` | Swaps returning ↔ registration panels |
| `showMainApp()` | Entry point after login — renders dashboard, loads leaderboard + chirps |
| `renderDashboard()` | Main dashboard render — ring, stats, button state, calendar |
| `logPushups(useDatePicker)` | Logs pushups — auto-detects active tab for correct input ID |
| `loadLeaderboard()` | Fetches + renders both leaderboard tables |
| `renderIndividualLeaderboard()` | Individual table with medals, active filter |
| `renderHallLeaderboard()` | Hall table with trophy |
| `loadChirps()` | Fetches chirps, builds ticker with type-specific emojis |
| `editTotal()` | Opens edit flow for today's logged total |

## Input ID Map (IMPORTANT — do not duplicate IDs)
| Element | Dashboard ID | Log Tab ID |
|---------|-------------|------------|
| Pushup count input | `dash-log-count` | `log-count` |
| Log button | `dash-log-btn` | `log-today-btn` |
| Already-logged badge | `dash-already-logged` | `already-logged` |

`logPushups()` auto-detects active tab: `const dashActive = document.getElementById('tab-dashboard').style.display !== 'none'`

## Chirp System
- **Sheet tabs:** Roast, Praise, Hype, Shame (auto-created by `ensureChirpTabs()` on first chirps call)
- **Seed data:** Embedded in `CHIRP_SEED` constant in Apps Script (110 messages total)
- **Placeholders:** `{name}`, `{bank}`, `{deficit}` in message templates
- **Return format:** `{ chirps: [{text: "...", type: "praise|roast|hype|shame"}] }`
- **Emojis:** praise=🔥 roast=😂 hype=🎆 shame=👎
- **Eligibility:** Only participants with totalDone > 0 are targeted

## Critical Calculation Rules
- **totalDone** = `state.myLog.reduce((sum, l) => sum + l.count, 0)` — NOT a schedule loop (schedule loop misses off-schedule days)
- **bank** = totalDone − totalRequired (sum of scheduled targets up to and including today)
- **Hall rank** = sorted by `avgBank` (average bank per member) — normalises for hall size

## Verification Pattern
After every deploy:
```javascript
// 1. Confirm new code is live
document.body.innerHTML.includes('unique-new-string')

// 2. Confirm specific element
document.getElementById('element-id')?.textContent
```
Always use `?bust=NNNNN` (increment N each time) to force CDN cache bypass. Vercel takes 2-3 min per deploy.
