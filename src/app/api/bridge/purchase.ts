// Paid readings for My Little Shadow: hosted Stripe Checkout with an inline price per product
// (The Rainbow Bridge $14.99, What they'd tell you $9.99 USD).
// Deliberately creates no Stripe products, prices or webhooks, so nothing else on the account changes.
// Each purchase is tracked in BRIDGE KV as buy:<checkout session id>; its metadata.app ties it to one product.

export type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type Purchase = {
  app?: string;
  pi: string; // payment intent, for refunds
  created: number; // unix seconds
  allowed: number; // readings this purchase may produce (1, or 2 after a free retry)
  used: number;
  refunded: boolean;
  reading?: Record<string, unknown>;
};

export type Product = {
  app: string; // Stripe metadata.app, so a session paid for one product can't unlock another
  cents: number;
  name: string;
  description: string;
  page: string; // path the checkout returns to
  displayName: string;
  background: string;
  button: string;
  font: string;
  suffix: string; // statement descriptor suffix
};

export const REFUND_DAYS = 30;
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

export async function createCheckout(key: string, origin: string, product: Product): Promise<string> {
  const page = `${origin}${product.page}`;
  const session = await stripe(key, "POST", "checkout/sessions", {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(product.cents),
    "line_items[0][price_data][product_data][name]": product.name,
    "line_items[0][price_data][product_data][description]": product.description,
    success_url: `${page}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${page}?canceled=1`,
    "metadata[app]": product.app,
    "payment_intent_data[metadata][app]": product.app,
    "payment_intent_data[description]": product.name,
    // Per-session branding so the shared account's own name and look stay untouched.
    "branding_settings[display_name]": product.displayName,
    "branding_settings[background_color]": product.background,
    "branding_settings[button_color]": product.button,
    "branding_settings[font_family]": product.font,
    "branding_settings[border_style]": "pill",
    "payment_intent_data[statement_descriptor_suffix]": product.suffix,
  });
  return session.url;
}

const read = async (store: KV | null, k: string) => (store ? store.get(k) : devStore.get(k) ?? null);

export async function savePurchase(store: KV | null, sid: string, p: Purchase) {
  if (store) await store.put(`buy:${sid}`, JSON.stringify(p), { expirationTtl: TTL });
  else devStore.set(`buy:${sid}`, JSON.stringify(p));
}

// Returns the purchase for a paid checkout session of this product, or null if it isn't one.
// Purchases saved before products existed have no app and are Rainbow Bridge ones.
export async function loadPurchase(key: string, store: KV | null, sid: string, app: string): Promise<Purchase | null> {
  const saved = await read(store, `buy:${sid}`);
  if (saved) {
    const p: Purchase = JSON.parse(saved);
    return (p.app ?? "rainbow-bridge") === app ? p : null;
  }
  const s = await stripe(key, "GET", `checkout/sessions/${sid}`);
  if (s.payment_status !== "paid" || s.metadata?.app !== app) return null;
  const p: Purchase = { app, pi: s.payment_intent, created: s.created, allowed: 1, used: 0, refunded: false };
  await savePurchase(store, sid, p);
  return p;
}

export const canRefund = (p: Purchase) => !p.refunded && Date.now() / 1000 - p.created < REFUND_DAYS * 86400;

export async function refund(key: string, p: Purchase) {
  await stripe(key, "POST", "refunds", {
    payment_intent: p.pi,
    reason: "requested_by_customer",
    "metadata[app]": p.app ?? "rainbow-bridge",
  });
}
