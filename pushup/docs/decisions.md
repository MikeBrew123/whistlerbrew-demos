# Pushup Challenge — Decisions & Lessons Learned
_Last updated: 2026-03-01_

## Architecture Decisions

### 2026-03-01 — totalDone calculation must use myLog.reduce()
**Decision:** Calculate totalDone from `state.myLog.reduce((sum, l) => sum + l.count, 0)` — never from a schedule loop.
**Why:** Schedule loop only counts dates that appear in the schedule. Pushups logged on days NOT in the schedule (e.g., a rest day or unscheduled date) are silently dropped, causing totalDone and bank to show 0 even when pushups exist.
**Rule:** Any stat that counts all pushups ever logged must use the myLog array directly.

### 2026-03-01 — Duplicate input IDs solved with tab-prefixed IDs
**Decision:** Dashboard uses `dash-log-count` / `dash-log-btn`; Log tab uses `log-count` / `log-today-btn`.
**Why:** The log form exists in two places (dashboard right column + Log Pushups tab). HTML requires unique IDs. `logPushups()` auto-detects the active tab to read from the correct input.
**Rule:** Never add a second element with an existing ID. If a component is duplicated across tabs, prefix IDs with the tab name.

### 2026-03-01 — Chirp API returns {text, type} objects, not plain strings
**Decision:** Apps Script `handleChirps()` returns `[{text: "...", type: "praise|roast|hype|shame"}]`.
**Why:** Frontend needs the chirp type to apply the correct emoji separator. Plain strings would require regex parsing of message content which is fragile.
**Rule:** If the frontend needs metadata about a data item, return it as a structured object from the API — not embedded in the string.

### 2026-03-01 — Hall ranking uses average bank per member
**Decision:** Hall leaderboard sorted by `avgBank` (total bank / member count), not total pushups or total bank.
**Why:** A hall with 10 members accumulates more total pushups than a hall with 2. Averaging normalises for size and rewards consistent effort across the whole hall.
**Rule:** Any hall-level metric that compares halls of different sizes must be normalised per member.

### 2026-03-01 — Chirp tabs are lazy-created, not setup manually
**Decision:** `ensureChirpTabs()` is called at the start of every `handleChirps()` invocation and creates the tabs from `CHIRP_SEED` if they don't already exist.
**Why:** Requiring a one-time manual setup step creates a deployment dependency and risk of forgetting. Lazy creation is zero-maintenance.

### 2026-03-01 — Log button is context-aware (colour + label)
**Decision:** Button shows red "+ Add to Today" when below target; green "+ Add to Your Bank" when goal met or no target today.
**Why:** Tells the participant exactly where their pushups are going. Removes ambiguity about whether extra pushups "count" on a scheduled day vs a rest day.

---

## Lessons Learned (Do Not Repeat)

### Vercel CDN caching delays verification
**Problem:** After `git push`, the deployed file is cached at Vercel's edge. Different edge nodes serve different versions for 2-3 minutes. Checking the live URL immediately after push often returns stale content — confirmed "deployed" but old code was actually serving.
**Fix:** Always append `?bust=NNNNN` (unique integer each time) to force a cache-busted fetch. Use `document.body.innerHTML.includes('unique-string-from-new-code')` to confirm the right version is live before marking verified.
**Rule:** Never mark a change verified until `includes()` returns true on a fresh bust URL.

### Chrome Extension disconnects during long waits
**Problem:** Using `wait()` calls longer than ~15-20 seconds in Chrome MCP tools causes the extension to disconnect, requiring reconnect via `tabs_context_mcp`.
**Fix:** Use `Bash sleep` for waiting instead of Chrome MCP wait. Reconnect with `tabs_context_mcp` after each disconnect.

### False positive version checks
**Problem:** Checking `renderDashboard.toString().includes('state.myLog.reduce')` returned true for OLD code because the old weekly-avg calculation also used `state.myLog.reduce`. The check appeared to confirm the new code was live when it wasn't.
**Fix:** Always check for a string that is UNIQUE to the new code — not a common pattern. Use a variable name (`totalRequired`) or exact phrase that only exists in the new version.

### preview_start reuses running server
**Problem:** `preview_start` consistently returned the already-running etsy-preview server (port 8765) instead of starting the pushup server. Could not use local preview for this project.
**Fix:** Verify changes directly against the live Vercel URL using Chrome MCP. This is actually preferable anyway since it tests the real deployment.

### Apps Script CORS — no Content-Type header on requests
**Problem:** Adding `Content-Type: application/json` to fetch requests to the Apps Script URL causes a CORS preflight, which the Apps Script ANYONE_ANONYMOUS deployment rejects.
**Fix:** Never set Content-Type on Apps Script GET/POST requests. Use URL params for GET, bare body for POST. The script handles plain text body parsing.

---

## Data Protection Rules
1. **Real users are in the sheet.** Participants have registered and logged pushups. Never delete rows, clear tabs, or run destructive SQL/sheet operations without explicit confirmation.
2. **Chirp tab creation is safe** — `ensureChirpTabs()` only creates tabs if they don't exist. It never modifies existing data.
3. **Apps Script changes deploy immediately** — unlike Vercel (2-3 min), clasp deploy is instant. Test logic changes carefully. A bug in `handleLog` could corrupt participant data.
4. **Never test with production participant IDs** in a destructive way. Use a test registration if you need to verify the write path.
