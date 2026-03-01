# whistlerbrew-demos — CLAUDE.md

## ⚠️ LIVE APP WITH REAL USER DATA
**whistlerbrew.com/pushup** is live and has real participants registered with logged pushups.
- Never wipe, clear, or destructively modify the Google Sheet
- Always verify changes carefully before deploying
- When in doubt, read `pushup/docs/decisions.md` → Data Protection Rules

---

## Active Project: Pushup Challenge

### Key Docs (read these first)
| File | Purpose |
|------|---------|
| `pushup/docs/current-status.md` | Full architecture, file locations, deploy commands, API endpoints, key functions |
| `pushup/docs/decisions.md` | Why things are built the way they are + lessons learned (do not repeat these mistakes) |

### Quick Reference
- **Live URL:** https://whistlerbrew.com/pushup/index.html
- **Frontend source:** `pushup/pushup-challenge.html`
- **Deployed copy:** `public/pushup/index.html` ← always sync before committing
- **Backend:** Google Apps Script (clasp project at `/tmp/pushup-apps-script/`)
- **Apps Script source:** `pushup/google-apps-script.js` ← always sync to `/tmp/pushup-apps-script/Code.gs` before clasp push

### Deploy Workflow
**Frontend:**
```bash
cp pushup/pushup-challenge.html public/pushup/index.html
git add pushup/pushup-challenge.html public/pushup/index.html
git commit -m "message"
git push
# Vercel auto-deploys in 2-3 min — verify with ?bust=NNNNN cache param
```

**Apps Script:**
```bash
cp pushup/google-apps-script.js /tmp/pushup-apps-script/Code.gs
cd /tmp/pushup-apps-script
clasp push
clasp deploy -i AKfycbzWO2I7Ldrsau8q5Pc8P45PDvex065s1MpP6T__W76wviu-wDhFc10UX5Zb9alc2DVrRg
```

### Verification (always do this after deploy)
```javascript
// In Chrome MCP — navigate to live URL with fresh bust param
document.body.innerHTML.includes('unique-string-from-new-code')
```
Vercel CDN caches aggressively. Use incrementing `?bust=NNNNN` params until `includes()` returns true.

---

## Session Start Checklist
1. Read `pushup/docs/current-status.md` for current state
2. Read `pushup/docs/decisions.md` for rules and lessons learned
3. Remember: real users are in the system — protect their data
