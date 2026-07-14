# SPS Deploy v2 — Multi-User Plan

**Status: PLAN ONLY — nothing here is built yet.** Written 2026-07-14 after the v1 feature-complete build (2026-07-12).

## Where we are (v1)

Single-file offline-first PWA at whistlerbrew.com/sps-deploy/. All data lives in localStorage on each phone. Supabase (borrowed corner of the CarnivoreWeekly project) holds two anonymous capability-URL tables: `sps_boards` (live read-only share) and `sps_archives` (end-of-deployment backup). No accounts. T-Card scanning calls the Anthropic API directly from the browser with a user-supplied key.

v1's superpower is that it **cannot fail in the field** — no login, no server dependency, everything works in a dead zone. v2 must keep that property.

## v2 goals

1. **Login per user** — every SPS/TFL has an account; data follows them across devices and survives lost phones.
2. **STAM incident view** — overhead sees every TFL's crews on the fire: check-in status, outstanding paperwork, no-contact events, live.
3. **End-of-fire crew summary** — per-crew report (check-in reliability, paperwork compliance, no-contact history) to make reviews easier.

**Non-negotiable:** the TFL's own workflow (check-ins, paperwork, T-Cards) must keep working with zero bars. Sync is opportunistic, never required.

---

## Architecture decisions

### 1. Move to its own repo + hosting (Phase 0)

Move out of `whistlerbrew-demos` into a dedicated `sps-deploy` repo with its own Cloudflare Pages project.

- Why: real users beyond Mike; independent deploys; the wildfire cron pollutes this repo's history every 15 min; secrets isolation.
- URL: keep `whistlerbrew.com/sps-deploy/` via redirect, or move to `sps.whistlerbrew.com` (cleaner for a real tool). **Open question for Mike.**
- Stack stays vanilla JS single-file PWA as long as practical — it has served well. If the codebase outgrows one file in Phase 2, split into modules with a tiny build step (esbuild), still static output.

### 2. Dedicated Supabase project (Phase 0)

New Supabase project just for SPS Deploy, **Canadian region (ca-central-1, Montreal)** — right optics for a tool holding BC gov-adjacent crew data.

- Migrate the two existing tables (trivial — a few rows).
- Free tier is fine to start (500 MB DB, 50k monthly active users on auth). Upgrade to Pro (~$25 USD/mo) during fire season if we want daily backups and no cold pauses. **Open question for Mike.**

### 3. Auth: Supabase Auth, email OTP (Phase 1)

- **Email one-time code** (6-digit) as primary. No passwords to forget at 06:00 on day 9. Magic links as secondary (they misbehave in some mail filters).
- Personal emails, matching how the SPS contact list works. Phone-number OTP is possible later but costs SMS credits.
- **Offline grace:** session persists on device; if the JWT expires while out of service, the app keeps working locally and re-authenticates on the next sync. Login is only ever needed online, once per device.
- **Guest mode stays:** the app works exactly like v1 with no account; logging in later uploads the local deployment. Nobody is ever blocked at the trailhead by an auth screen.
- Roles are **per-incident**, not global (see data model): the same person is a TFL on one fire and a STAM on the next.

### 4. Offline-first sync: custom outbox queue (Phase 1)

Evaluated: PowerSync / ElectricSQL / RxDB replication (heavy, some paid, all bring a big runtime) vs. a hand-rolled sync queue. **Recommendation: hand-rolled outbox.** The ownership model makes this easy: a TFL's crews/rounds/paperwork are written by exactly one person, so conflicts barely exist and last-write-wins per record is correct.

- Storage moves localStorage → **IndexedDB** (via ~1 KB idb-keyval wrapper) — more capacity for T-Card photos, less eviction risk.
- Every mutation: apply locally → append to outbox → background flush when online (batched POST to an edge function that validates + upserts with server timestamps).
- Pull: incremental `since=cursor` fetch of *your own* records (for multi-device). You never need other people's data offline — the STAM view is an online view with a cached last-known snapshot.
- The v1 anonymous share-board keeps working until Phase 2 replaces it.

---

## Data model (Postgres)

```
profiles          id (= auth.users.id), name, callsign, phone, home_position
incidents         id, type (single|complex|mzoc), name, number, join_code,
                  status (open|closed), created_by, created_at, closed_at
incident_fires    id, incident_id, num, name
incident_members  incident_id, user_id, role (tfl|stam|viewer), joined_at
crews             id, incident_id, owner_user_id, name, callsign, leader,
                  channel, notes, archived, created_at, released_at
crew_members      id, crew_id, name, role, phone, notes
checkin_rounds    id, incident_id, owner_user_id, started_at, closed_at, fire_num
checkins          round_id, crew_id, time, missed, note
paperwork         id, incident_id, crew_id, day, kind (214|dtr),
                  received_at, received_by
nocontact_events  id, crew_id, missed_at, escalated_at, contact_at, fire_num
nocontact_attempts event_id, time
```

**RLS in one sentence:** membership in `incident_members` gates reads on everything in that incident; writes are allowed only on rows you own (`owner_user_id = auth.uid()`); `stam` role reads the whole incident. SQL views (`incident_checkin_latest`, `incident_paperwork_status`) power the STAM dashboard.

**Joining a fire:** the incident creator (usually the STAM or first TFL) shares a 6-character join code or QR; entering it adds you as a `tfl` member. No admin bottleneck.

---

## Feature designs

### STAM incident view (Phase 2)

A role-gated "Incident" tab (same app, no separate site):

- **Top: active no-contact events** across all TFLs — red, with attempt counts and escalation status.
- **Check-in matrix** — one row per TFL: last round time, crews checked/missed, overdue flag based on that TFL's schedule.
- **Paperwork rollup** — crew × day matrix of 214/DTR with the same green/yellow/red colour rules as v1, plus incident totals ("6 of 41 items outstanding").
- **Roster** — every crew on the fire with leader and headcount; taps through to detail (read-only).
- Live via Supabase Realtime subscription, falling back to 60-second polling; shows "last updated" and a stale-data warning exactly like the v1 board.

### End-of-fire crew summary (Phase 3)

When an incident closes (or on demand):

- **Per-crew stats compiled in SQL:** days on incident, fires worked, check-in reliability (n checked / n rounds, no-contact count, mean re-contact time), paperwork compliance (% on-time 214/DTR, missing days), roster with days present.
- **Narrative paragraph per crew written by Claude** from the structured stats — flags patterns ("L-4 missed three morning check-ins in a row after moving to K53307") a table hides. Generated server-side in an edge function.
- Output: in-app summary page + downloadable HTML/PDF report per crew and for the whole incident — same style as the v1 deployment report. Stored in a Supabase storage bucket, linked from the closed incident.

### T-Card scan moves server-side (Phase 1, small)

The vision call moves into an edge function: users stop pasting their own Anthropic API key; the key lives as a function secret; requires login; per-user rate limit. Same model, same UX, one less setup step for every colleague.

### Push notifications (Phase 3, optional)

Web Push (VAPID) works on installed iOS PWAs since 16.4. A scheduled edge function checks for overdue check-ins and due no-contact reminders and pushes to the lock screen — fixes the "phone in pocket" gap in v1's in-app reminders.

---

## Model choices (AI parts)

| Part | Model | Why | Cost |
|---|---|---|---|
| T-Card handwriting scan | **claude-sonnet-5** (vision) | Best available handwriting OCR; already proven in v1 | ~1–2¢/scan |
| Crew summary narratives | **claude-sonnet-5** | High-quality short-form writing from structured data | <1¢/crew |
| Season-wide trend roll-ups (optional, later) | **claude-fable-5** | Deepest synthesis across many incidents — only if this becomes a thing | pennies, rare |
| Auth, sync, STAM view, reports plumbing | none | Deterministic code; no AI needed | — |

All API calls move server-side (edge functions) so no user ever handles a key.

---

## Phased roadmap

| Phase | Ships | Effort* | Risk |
|---|---|---|---|
| **0 — Foundations** | Own repo + Pages project, dedicated Supabase (ca-central-1), migrate 2 tables, redirects. No visible change. | ~half a day | Low |
| **1 — Accounts & sync** | Email-OTP login, profiles, IndexedDB + outbox sync, multi-device, guest mode, server-side T-Card scan | 2–3 days | Medium (sync edge cases) |
| **2 — Incidents & STAM view** | Create/join incidents (join codes/QR), per-incident roles, live STAM dashboard, retire anon board | 2–3 days | Medium (RLS correctness) |
| **3 — Summaries & push** | End-of-fire crew summaries (+ AI narrative), incident report bucket, web push reminders | 1–2 days | Low |

*Focused build sessions, each phase independently shippable and testable before the next. Phase 1 alone already solves "lost phone" and "colleague setup" — worth shipping before fire season peaks even if 2–3 wait.

## Costs

- Cloudflare Pages: free.
- Supabase: free tier to start; ~$25 USD/mo Pro optional during season (daily backups, no project pausing).
- Anthropic API: realistically **under $5/season** at plausible scan/summary volumes.
- Web push: free.

## Risks & mitigations

- **Sync bugs eating field data** → outbox is append-only and never deletes local state until the server acks; local export (v1 behaviour) stays as the escape hatch.
- **RLS mistakes leaking another incident's data** → RLS tested with automated policy tests before Phase 2 ships; deny-by-default like the v1 tables.
- **Personal data in the cloud** (crew names + phones) → Canadian region, RLS, no anon access, and the on-device contact directory stays on-device. Disclaimer stays: personal tool, not an official BCWS system.
- **iOS storage eviction** → largely *solved* by v2 (cloud is the backup); IndexedDB further reduces risk for guests.
- **Clock skew on field phones** → server timestamps assigned at flush; device times kept only as display hints.

## Open questions for Mike

1. **URL:** keep `whistlerbrew.com/sps-deploy/` or move to `sps.whistlerbrew.com`?
2. **Data comfort:** OK with crew member names + phone numbers syncing to the (Canadian-region, locked-down) database — or should contact details stay device-only with only operational data synced?
3. **Incident creation:** anyone with an account can create an incident and share the join code (recommended), or restricted?
4. **Budget:** start on Supabase free tier and upgrade only if needed (recommended), or go straight to Pro for the season?
