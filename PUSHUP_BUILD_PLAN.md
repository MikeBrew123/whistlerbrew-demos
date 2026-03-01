# Pushup Challenge — Build Plan (Resume After Restart)

## Status
- [x] Step 0: Credentials copied to `config/service-account.json`
- [x] Step 0: Google Sheets MCP added (needs restart to load)
- [x] Step 0: `.gitignore` updated to exclude `config/service-account.json`
- [x] Step 0: `public/pushup/` directory created
- [ ] Agent 1: Source files updated → `pushup/google-apps-script.js` + `pushup/pushup-challenge.html` (IN PROGRESS)
- [ ] Agent 2: Create Google Sheet via MCP + populate data
- [ ] Agent 3: clasp deploy Apps Script (needs Sheet ID from Agent 2)
- [ ] Agent 4: Frontend wire + Vercel deploy (needs API URL from Agent 3 + files from Agent 1)
- [ ] End-to-end testing

## After Restart — Execute in This Order

### 1. Verify Google Sheets MCP
Test that the MCP loaded: try listing or creating a spreadsheet.

### 2. Check Agent 1 Output
Source files should be in `pushup/` directory. Verify:
- All dates say 2026
- Halls: Whistler Hall 1, Hall 2, Hall 3, Other
- 15 participants pre-loaded in setupSheets()
- Blank-hall prompt flow in HTML
- Both returning + new user registration flows

### 3. Create Google Sheet (Agent 2)
Via MCP, create "Pushup Challenge 2026" with 3 tabs:
- **Schedule**: 30 rows of March 2026 data (same targets as spec)
- **Participants**: 15 pre-loaded people (hall = blank, joined = 2026-03-01)
- **Log**: headers only (participant_id, date, count, logged_at)

Share the sheet with the service account if needed.

### 4. Deploy Apps Script (Agent 3)
```bash
mkdir -p /tmp/pushup-apps-script
cd /tmp/pushup-apps-script
clasp create --title "Pushup Challenge API" --type sheets --parentId SPREADSHEET_ID
cp /Users/mbrew/Developer/whistlerbrew-demos/pushup/google-apps-script.js Code.gs
# Create appsscript.json manifest
clasp push
clasp deploy --description "Pushup Challenge API v1"
```
Capture deployment URL.

### 5. Frontend Wire + Deploy (Agent 4)
- In `pushup/pushup-challenge.html`, replace `API_URL` placeholder with deployment URL
- Copy to `public/pushup/index.html`
- Git add, commit, push → Vercel auto-deploys
- Live at: https://whistlerbrew.com/pushup

## 15 Pre-loaded Participants
Will Brookes, Andy Lawrence, Joe Knight, Ken Roberts, Owen Guthrie, Andrew Tress, Paul Van Den Berg, JD McLean, Gavin Reed, Lana Charlebois, Emily Wood, Keren Wareham, Ryan Donohue, Cormac O'Brien, Brew

## Fire Halls
Whistler Hall 1, Whistler Hall 2, Whistler Hall 3, Other (free text)

## March 2026 Schedule
| date | target | label |
|------|--------|-------|
| 2026-03-02 | 80 | |
| 2026-03-03 | 65 | |
| 2026-03-04 | 45 | recovery |
| 2026-03-05 | 145 | |
| 2026-03-06 | 115 | |
| 2026-03-07 | 200 | big day |
| 2026-03-08 | 0 | REST |
| 2026-03-09 | 100 | |
| 2026-03-10 | 85 | |
| 2026-03-11 | 70 | recovery |
| 2026-03-12 | 155 | |
| 2026-03-13 | 125 | |
| 2026-03-14 | 110 | |
| 2026-03-15 | 0 | REST |
| 2026-03-16 | 95 | |
| 2026-03-17 | 80 | |
| 2026-03-18 | 220 | big day |
| 2026-03-19 | 170 | |
| 2026-03-20 | 235 | big day |
| 2026-03-21 | 135 | |
| 2026-03-22 | 0 | REST |
| 2026-03-23 | 120 | |
| 2026-03-24 | 100 | |
| 2026-03-25 | 85 | recovery |
| 2026-03-26 | 180 | |
| 2026-03-27 | 145 | |
| 2026-03-28 | 250 | big day |
| 2026-03-29 | 0 | REST |
| 2026-03-30 | 125 | |
| 2026-03-31 | 110 | |

## Key Config
- Service account: `carnivoreweekly@n8n-cal-466417.iam.gserviceaccount.com`
- Google Cloud project: `n8n-cal-466417`
- Apps Script timezone: `America/Vancouver`
- Apps Script access: `ANYONE_ANONYMOUS`
- Vercel auto-deploys on push to `main` branch
- Source files: `/Users/mbrew/Downloads/` (originals), `pushup/` (working copies)
- Deploy target: `public/pushup/index.html`
