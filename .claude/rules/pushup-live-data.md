---
paths:
  - "pushup/**"
  - "public/pushup/**"
---
# Pushup Challenge: live app with real user data
- Real participants and logged pushups live in the backing Google Sheet. Never wipe, clear, or bulk-rewrite it. Reads are fine; writes go through the Apps Script API only.
- Before any change, read `pushup/docs/decisions.md` → Data Protection Rules.
- `pushup/pushup-challenge.html` is the source; `public/pushup/index.html` is the deployed copy. Sync before committing, never edit the copy.
- Verify every deploy on the live URL with a fresh `?bust=NNNNN` param before telling Brew it is done.
