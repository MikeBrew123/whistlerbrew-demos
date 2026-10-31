#!/usr/bin/env python3
"""My Little Shadow support inbox check (hello@mylittleshadow.com, Resend). No AI.

Runs twice a day from LaunchAgent com.minibrew.mls-inbox. Sends Brew one Telegram message
(~/bin/notify.sh) when there is something to act on:
  - new customer emails since the last run, refund requests marked,
  - repeat refund requesters (same sender asking for a refund again),
  - anything still unread after 20 hours, because the site promises a reply within 24.
Quiet when nothing needs doing. A failure goes to ~/bin/janitor-alert.sh once a day.
State: ~/HomeBrain/state/mls-inbox.json. Log: ~/Library/Logs/aihub/mls-inbox.log.
Stop switch: chmod -x ~/bin/mls-inbox-check.py
"""
import json, os, re, subprocess, sys, urllib.request
from datetime import datetime, timezone, timedelta

INBOX = "f3faa0a7-3743-4587-a8f8-9180e45d6ba1"
OWN = "hello@mylittleshadow.com"
HOME = os.path.expanduser("~")
STATE = f"{HOME}/HomeBrain/state/mls-inbox.json"
LOG = f"{HOME}/Library/Logs/aihub/mls-inbox.log"
ENV = f"{HOME}/Developer/carnivore-weekly/.env"
REFUND = re.compile(r"refund|money back|charge ?back|dispute|reembols|devoluci|cancel", re.I)
OVERDUE = timedelta(hours=20)


def log(msg):
    with open(LOG, "a") as f:
        f.write(f"{datetime.now():%F %T} {msg}\n")


def api_key():
    for line in open(ENV):
        if line.startswith("RESEND_API_KEY="):
            return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit("RESEND_API_KEY missing")


def threads(key):
    req = urllib.request.Request(f"https://api.resend.com/inboxes/{INBOX}/threads?limit=100",
                                 headers={"Authorization": f"Bearer {key}", "User-Agent": "mls-inbox-check"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("data", [])


def sender(t):
    f = t.get("from") or ""
    if isinstance(f, list):
        f = f[0] if f else ""
    if isinstance(f, dict):
        f = f.get("email") or f.get("address") or ""
    m = re.search(r"[\w.+-]+@[\w.-]+", str(f))
    return (m.group(0) if m else str(f)).lower()


def main():
    state = json.load(open(STATE)) if os.path.exists(STATE) else {"seen": [], "refunders": {}, "warned": []}
    now = datetime.now(timezone.utc)
    new, refunds, repeats, overdue = [], [], [], []
    for t in threads(api_key()):
        who = sender(t)
        if who == OWN or t.get("folder") not in (None, "inbox"):
            continue
        subject = (t.get("subject") or "(no subject)")[:80]
        line = f"{who}: {subject}"
        if t["id"] not in state["seen"]:
            state["seen"].append(t["id"])
            new.append(line)
            if REFUND.search(subject):
                refunds.append(line)
                n = state["refunders"].get(who, 0) + 1
                state["refunders"][who] = n
                if n > 1:
                    repeats.append(f"{who} ({n} refund emails)")
        received = datetime.fromisoformat(t["received_at"].replace("Z", "+00:00"))
        if not t.get("read") and now - received > OVERDUE and t["id"] not in state["warned"]:
            state["warned"].append(t["id"])
            overdue.append(f"{line} ({int((now - received).total_seconds() // 3600)}h old)")
    state["seen"] = state["seen"][-500:]
    state["warned"] = state["warned"][-500:]

    parts = []
    if new:
        parts.append(f"{len(new)} new email(s), {len(refunds)} about a refund:\n" + "\n".join(f"- {l}" for l in new[:10]))
    if repeats:
        parts.append("Repeat refund requests, worth a look before refunding:\n" + "\n".join(f"- {r}" for r in repeats))
    if overdue:
        parts.append("Unread for over 20 hours (we promise a reply within 24):\n" + "\n".join(f"- {o}" for o in overdue))
    if parts:
        subprocess.run([f"{HOME}/bin/notify.sh", "📬 My Little Shadow inbox\n\n" + "\n\n".join(parts)], check=False)
    json.dump(state, open(STATE, "w"))
    log(f"ok new={len(new)} refunds={len(refunds)} repeats={len(repeats)} overdue={len(overdue)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FAIL {e!r}")
        stamp = f"{HOME}/HomeBrain/state/mls-inbox.failed-{datetime.now():%F}"
        if not os.path.exists(stamp):
            open(stamp, "w").close()
            subprocess.run([f"{HOME}/bin/janitor-alert.sh", "My Little Shadow inbox check failed",
                            f"{e!r}. Script ~/bin/mls-inbox-check.py, log {LOG}"], check=False)
        sys.exit(1)
