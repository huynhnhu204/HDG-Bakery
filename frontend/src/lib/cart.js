/* Shared cart client: add/update/remove with API-first, localStorage fallback, and event dispatch */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

const CART_LS_KEY = "cart";

function buildLineId(productId, variantId) {
  if (productId && variantId) return `pv:${productId}:${variantId}`;
  if (productId) return `p:${productId}`;
  if (variantId) return `v:${variantId}`;
  return `custom:${Math.random().toString(36).slice(2, 10)}`;
}

function clampQty(n) {
  const x = Number(n || 0);
  return x < 1 ? 1 : Math.min(x, 999);
}

function readLocalCart() {
  try {
    const raw = localStorage.getItem(CART_LS_KEY);
    return raw ? JSON.parse(raw) : { items: [], updatedAt: Date.now() };
  } catch {
    return { items: [], updatedAt: Date.now() };
  }
}

function writeLocalCart(cart) {
  try {
    localStorage.setItem(CART_LS_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  } catch {}
}

async function tryJson(url, init) {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  try { return await res.json(); } catch { return null; }
}

export async function addToCart(payload) {
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const candidates = [
    `${API_BASE}/api/v1/cart/add`,
    `${API_BASE}/api/cart/add`,
    `${API_BASE}/cart/add`,
  ];
  // API-first
  for (const url of candidates) {
    try {
      const beCart = await tryJson(url, { method: "POST", headers, body });
      if (beCart && Array.isArray(beCart.items)) {
        writeLocalCart({ items: beCart.items, updatedAt: Date.now() });
        return { ok: true, source: "api", cart: beCart };
      }
    } catch {}
  }
  // Fallback local
  const pid = payload.product_id ?? null;
  const vid = payload.variant_id ?? null;
  const lineId = payload.line_id || buildLineId(pid, vid);
  const cart = readLocalCart();
  if (!Array.isArray(cart.items)) cart.items = [];
  const idx = cart.items.findIndex(it => (it.line_id || buildLineId(it.product_id, it.variant_id)) === lineId);
  if (idx >= 0) {
    cart.items[idx].qty = clampQty((cart.items[idx].qty || 0) + clampQty(payload.qty || 1));
  } else {
    cart.items.push({
      ...payload,
      id: lineId,
      line_id: lineId,
      qty: clampQty(payload.qty || 1),
    });
  }
  cart.updatedAt = Date.now();
  writeLocalCart(cart);
  return { ok: true, source: "local", cart };
}

export async function updateCartQuantity(lineId, quantity) {
  const q = clampQty(quantity);
  const candidates = [
    { url: `${API_BASE}/api/v1/cart/update`, method: "PUT", body: { line_id: lineId, quantity: q } },
    { url: `${API_BASE}/api/cart/update`, method: "PUT", body: { line_id: lineId, quantity: q } },
    { url: `${API_BASE}/cart/update`, method: "PUT", body: { line_id: lineId, quantity: q } },
  ];
  for (const c of candidates) {
    try {
      const beCart = await tryJson(c.url, { method: c.method, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(c.body) });
      if (beCart && Array.isArray(beCart.items)) {
        writeLocalCart({ items: beCart.items, updatedAt: Date.now() });
        return { ok: true, source: "api", cart: beCart };
      }
    } catch {}
  }
  // Local fallback
  const cart = readLocalCart();
  if (!Array.isArray(cart.items)) cart.items = [];
  const idx = cart.items.findIndex(it => (it.line_id || buildLineId(it.product_id, it.variant_id)) === lineId);
  if (idx >= 0) {
    cart.items[idx].qty = q;
    cart.items[idx].id = cart.items[idx].line_id || lineId;
  }
  cart.updatedAt = Date.now();
  writeLocalCart(cart);
  return { ok: true, source: "local", cart };
}

export async function removeCartItem(lineId) {
  const candidates = [
    `${API_BASE}/api/v1/cart/items/${encodeURIComponent(lineId)}`,
    `${API_BASE}/api/cart/items/${encodeURIComponent(lineId)}`,
    `${API_BASE}/cart/items/${encodeURIComponent(lineId)}`,
  ];
  for (const url of candidates) {
    try {
      const beCart = await tryJson(url, { method: "DELETE" });
      if (beCart && Array.isArray(beCart.items)) {
        writeLocalCart({ items: beCart.items, updatedAt: Date.now() });
        return { ok: true, source: "api", cart: beCart };
      }
    } catch {}
  }
  const cart = readLocalCart();
  cart.items = (cart.items || []).filter(it => (it.line_id || buildLineId(it.product_id, it.variant_id)) !== lineId);
  cart.updatedAt = Date.now();
  writeLocalCart(cart);
  return { ok: true, source: "local", cart };
}

export async function clearCart() {
  const candidates = [
    { url: `${API_BASE}/api/v1/cart/clear`, method: "POST" },
    { url: `${API_BASE}/api/cart/clear`, method: "POST" },
    { url: `${API_BASE}/cart/clear`, method: "POST" },
  ];
  for (const c of candidates) {
    try {
      const beCart = await tryJson(c.url, { method: c.method });
      if (beCart && Array.isArray(beCart.items)) {
        writeLocalCart({ items: beCart.items, updatedAt: Date.now() });
        return { ok: true, source: "api", cart: beCart };
      }
    } catch {}
  }
  const cart = { items: [], updatedAt: Date.now() };
  writeLocalCart(cart);
  return { ok: true, source: "local", cart };
}



