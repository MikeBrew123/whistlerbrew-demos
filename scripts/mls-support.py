#!/usr/bin/env python3
"""My Little Shadow support helper for refund emails (decision 2026-11-01). No AI.

The money-back process: someone emails hello@mylittleshadow.com within 30 days and says what
missed. We offer one new reading with new answers; if they'd rather not, we refund in full.

  python3 scripts/mls-support.py find  <email>   # their purchases (checkout session ids)
  python3 scripts/mls-support.py show  <sid>     # the purchase record kept in KV
  python3 scripts/mls-support.py retry <sid>     # allow one more reading, print the link to send them
  python3 scripts/mls-support.py refund <sid>    # full refund in Stripe, reading locked

Run from the repo root. Stripe key: the live key in carnivore-weekly/secrets/api-keys.json (.env.local only
holds the test key). KV: BRIDGE namespace via wrangler.
"""
import base64, json, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

NS = "283ff0103cdd4cc4ad1326410bc91692"
SITE = "https://mylittleshadow.com"
PAGES = {"what-theyd-tell-you": "/tell", "rainbow-bridge": "/bridge"}
KEEP = 60 * 86400  # same as the site's purchase TTL


def stripe_key():
    keys = Path(__file__).resolve().parents[2] / "carnivore-weekly" / "secrets" / "api-keys.json"
    key = json.loads(keys.read_text())["stripe"]["secret_key_live"]
    if not key.startswith("sk_live_"):
        sys.exit(f"Expected a live Stripe key in {keys}")
    return key


def stripe(method, path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(f"https://api.stripe.com/v1/{path}", data=body, method=method)
    req.add_header("Authorization", "Basic " + base64.b64encode(f"{stripe_key()}:".encode()).decode())
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def notify(text):
    """Telegram to Brew through the Mac mini's notify.sh (run there directly, or over ssh)."""
    local = Path.home() / "bin" / "notify.sh"
    cmd = [str(local), text] if local.exists() else ["ssh", "mini", f"~/bin/notify.sh {json.dumps(text)}"]
    if subprocess.run(cmd, capture_output=True).returncode:
        print("(Telegram alert didn't go through; tell Brew directly.)")


def wrangler(*args):
    return subprocess.run(["npx", "wrangler", "kv", "key", *args, "--namespace-id", NS],
                          capture_output=True, text=True)


def load(sid):
    r = wrangler("get", f"buy:{sid}")
    try:
        return json.loads(r.stdout)
    except ValueError:
        sys.exit(f"No purchase record for {sid}. It is created the first time they return from checkout.")


def save(sid, p):
    expires = int(p["created"]) + KEEP
    r = wrangler("put", f"buy:{sid}", json.dumps(p), "--expiration", str(expires))
    if r.returncode:
        sys.exit(r.stderr)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "find":
        q = urllib.parse.urlencode({"customer_details[email]": arg, "limit": 20})
        rows = [s for s in stripe("GET", f"checkout/sessions?{q}")["data"] if s.get("metadata", {}).get("app") in PAGES]
        for s in rows:
            print(s["id"], s["metadata"]["app"], s["payment_status"], f"${s['amount_total'] / 100:.2f}")
        if not rows:
            print("No My Little Shadow purchases for that email.")
    elif cmd == "show":
        print(json.dumps({k: v for k, v in load(arg).items() if k != "reading"}, indent=2))
    elif cmd == "retry":
        p = load(arg)
        if p.get("refunded"):
            sys.exit("Already refunded.")
        p["allowed"] = p.get("used", 0) + 1
        save(arg, p)
        print(f"Send them: {SITE}{PAGES.get(p.get('app'), '/bridge')}?paid={arg}&again=1")
        notify(f"My Little Shadow: new reading granted instead of a refund ({p.get('app')}, {arg[-8:]}).")
    elif cmd == "refund":
        p = load(arg)
        if p.get("refunded"):
            sys.exit("Already refunded.")
        stripe("POST", "refunds", {"payment_intent": p["pi"], "reason": "requested_by_customer",
                                   "metadata[app]": p.get("app", "rainbow-bridge")})
        p["refunded"] = True
        save(arg, p)
        print("Refunded in full. It reaches their card in 5 to 10 days.")
        notify(f"My Little Shadow: refund issued ({p.get('app')}, {arg[-8:]}).")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
