// Paid readings for /bridge: hosted Stripe Checkout with an inline $14.99 USD price.
// Deliberately creates no Stripe products, prices or webhooks, so nothing else on the account changes.
// Each purchase is tracked in BRIDGE KV as buy:<checkout session id>.

export type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type Purchase = {
  pi: string; // payment intent, for refunds
  created: number; // unix seconds
  allowed: number; // readings this purchase may produce (1, or 2 after a free retry)
  used: number;
  refunded: boolean;
  reading?: Record<string, unknown>;
};

export const PRICE_CENTS = 1499;
export const REFUND_DAYS = 30;
const APP = "rainbow-bridge";
const TTL = 60 * 60 * 24 * 60;
const devStore = new Map<string, string>(); // `next dev` has no KV

export const validSession = (sid: unknown): sid is string =>
  typeof sid === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid);

async function stripe(key: string, method: "GET" | "POST", path: string, form?: Record<string, string>) {
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`stripe ${path}: ${resp.status} ${data?.error?.message ?? ""}`);
  return data;
}

export async function createCheckout(key: string, origin: string): Promise<string> {
  const page = `${origin}/bridge/index.html`;
  const session = await stripe(key, "POST", "checkout/sessions", {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": "Rainbow Bridge Reading",
    "line_items[0][price_data][product_data][description]": "A personal reading and keepsake card. If it doesn't feel like them, your money back.",
    success_url: `${page}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${page}?canceled=1`,
    "metadata[app]": APP,
    "payment_intent_data[metadata][app]": APP,
    "payment_intent_data[description]": "Rainbow Bridge Reading",
    // Per-session branding so the shared account's own name and look stay untouched.
    "branding_settings[display_name]": "The Rainbow Bridge",
    "branding_settings[background_color]": "#14122e",
    "branding_settings[button_color]": "#f5c86a",
    "branding_settings[font_family]": "lora",
    "branding_settings[border_style]": "pill",
    "payment_intent_data[statement_descriptor_suffix]": "RAINBOW BRIDGE",
  });
  return session.url;
}

const read = async (store: KV | null, k: string) => (store ? store.get(k) : devStore.get(k) ?? null);

export async function savePurchase(store: KV | null, sid: string, p: Purchase) {
  if (store) await store.put(`buy:${sid}`, JSON.stringify(p), { expirationTtl: TTL });
  else devStore.set(`buy:${sid}`, JSON.stringify(p));
}

// Returns the purchase for a paid Rainbow Bridge checkout session, or null if it isn't one.
export async function loadPurchase(key: string, store: KV | null, sid: string): Promise<Purchase | null> {
  const saved = await read(store, `buy:${sid}`);
  if (saved) return JSON.parse(saved);
  const s = await stripe(key, "GET", `checkout/sessions/${sid}`);
  if (s.payment_status !== "paid" || s.metadata?.app !== APP) return null;
  const p: Purchase = { pi: s.payment_intent, created: s.created, allowed: 1, used: 0, refunded: false };
  await savePurchase(store, sid, p);
  return p;
}

export const canRefund = (p: Purchase) => !p.refunded && Date.now() / 1000 - p.created < REFUND_DAYS * 86400;

export async function refund(key: string, p: Purchase) {
  await stripe(key, "POST", "refunds", {
    payment_intent: p.pi,
    reason: "requested_by_customer",
    "metadata[app]": APP,
  });
}
