"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";

/* ================== Config ================== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

/* ================== Helpers ================== */
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";

function getAuthHeaders(json = false) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}
async function fetchJson(url, init = {}) {
  const r = await fetch(url, { cache: "no-store", ...init });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || `${r.status} ${r.statusText}`);
  return r.json();
}

/* Ưu tiên lấy price_sale; fallback price_buy/price */
function pickProductPrice(p) {
  const sale = Number(p.price_sale ?? p.sale_price ?? NaN);
  const base = Number(p.price_buy  ?? p.price      ?? NaN);
  if (!Number.isNaN(sale) && sale > 0) return sale;
  if (!Number.isNaN(base)) return base;
  return 0;
}

/* Cache sản phẩm theo ID để tránh gọi trùng */
const productCache = new Map();
async function loadProductById(id) {
  const key = String(id).trim();
  if (!key) throw new Error("ID trống");
  if (productCache.has(key)) return productCache.get(key);
  const p = await fetchJson(`${BASE}${API}/products/${key}`, { headers: getAuthHeaders() });
  productCache.set(key, p);
  return p;
}

/* Tải danh sách khách hàng (có fallback) */
async function loadCustomers() {
  const candidates = [
    `${BASE}${API}/customers?per_page=200`,
    `${BASE}${API}/users?role=customer&per_page=200`,
    `${BASE}${API}/users?type=customer&per_page=200`,
  ];
  for (const url of candidates) {
    try {
      const d = await fetchJson(url, { headers: getAuthHeaders() });
      const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
      if (list.length) return list;
    } catch {}
  }
  return [];
}

/* ================== Buttons ================== */
function Btn({ kind = "solid", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center h-10 px-4 rounded-xl transition-all focus:outline-none focus-visible:ring-2";
  const map = {
    solid: "bg-black text-white hover:opacity-95 focus-visible:ring-black/30 disabled:opacity-50",
    ghost: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus-visible:ring-black/20",
  };
  return <button {...props} className={`${base} ${map[kind]} ${className}`} />;
}

/* ================== Page ================== */
export default function OrderNewPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerMode, setCustomerMode] = useState("new"); // 'new' | 'existing'
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const [form, setForm] = useState({
    user_id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    payment_method: "COD",
    items: [{ product_id: "", name: "", price: 0, qty: 1 }],
  });

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setItem = (i, k, v) =>
    setForm((s) => {
      const next = [...s.items];
      next[i] = { ...next[i], [k]: v };
      return { ...s, items: next };
    });

  const addItem = () =>
    setForm((s) => ({ ...s, items: [...s.items, { product_id: "", name: "", price: 0, qty: 1 }] }));
  const removeItem = (i) =>
    setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));

  const subtotal = useMemo(
    () => form.items.reduce((t, x) => t + (Number(x.price) || 0) * (Number(x.qty) || 0), 0),
    [form.items]
  );

  /* ---- Load customers ---- */
  useEffect(() => {
    (async () => {
      setCustomersLoading(true);
      const list = await loadCustomers().catch(() => []);
      setCustomers(list);
      setCustomersLoading(false);
    })();
  }, []);

  /* ---- Khi chọn KH cũ → autofill ---- */
  useEffect(() => {
    if (customerMode !== "existing") return;
    const c = customers.find((x) => String(x.id) === String(selectedCustomerId));
    if (!c) return;
    setForm((s) => ({
      ...s,
      user_id: c.id || "",
      name: c.name || c.fullname || c.username || "",
      phone: c.phone || c.mobile || "",
      email: c.email || "",
      address: c.address || c.detail_address || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMode, selectedCustomerId, customers]);

  /* ---- Auto get sản phẩm theo Product ID (debounce) ---- */
  const productTimers = useRef({});
  function onProductIdChange(i, val) {
    setItem(i, "product_id", val ? Number(val) : "");
    clearTimeout(productTimers.current[i]);
    if (!val) return;

    productTimers.current[i] = setTimeout(async () => {
      try {
        const p = await loadProductById(val);
        setForm((s) => {
          const next = [...s.items];
          const price = pickProductPrice(p);
          next[i] = {
            ...next[i],
            product_id: Number(val),
            name: p.name || next[i].name,
            price: price ?? next[i].price,
          };
          return { ...s, items: next };
        });
        showToast("Đã lấy thông tin sản phẩm");
      } catch (e) {
        console.warn("Không tìm thấy sản phẩm:", e?.message || e);
      }
    }, 400);
  }

  /* ---- Save ---- */
  async function save() {
    if (saving) return;
    const errs = [];
    if (!form.name.trim()) errs.push("Vui lòng nhập tên khách hàng");
    if (!form.phone.trim()) errs.push("Vui lòng nhập số điện thoại");
    if (!form.address.trim()) errs.push("Vui lòng nhập địa chỉ");

    const validItems = form.items
      .map((it) => ({
        product_id: it.product_id ? Number(it.product_id) : undefined,
        name: (it.name || "").trim() || undefined,
        qty: Math.max(1, Number(it.qty || 0)),
        price: Math.max(0, Number(it.price || 0)),
      }))
      .filter((it) => it.qty >= 1 && it.price >= 0 && (it.product_id || it.name));

    if (validItems.length === 0) errs.push("Cần ít nhất 1 dòng sản phẩm hợp lệ");
    if (errs.length) return alert(errs.join("\n"));

    const payload = {
      user_id: form.user_id || undefined,
      name: form.name.trim(),
      email: form.email?.trim() || undefined,
      phone: form.phone.trim(),
      address: form.address.trim(),
      note: form.note?.trim() || undefined,
      payment_method: form.payment_method || "COD",
      items: validItems,
    };

    try {
      setSaving(true);
      const res = await fetch(`${BASE}${API}/orders`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Tạo đơn hàng thất bại");
      showToast("Đã tạo đơn hàng mới 🎉");
      router.push("/admin/orders");
    } catch (e) {
      alert(e.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Lọc KH theo từ khoá ---- */
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = (c.name || c.fullname || c.username || "").toLowerCase();
      const phone = (c.phone || c.mobile || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [customers, customerQuery]);

  /* ================== Render ================== */
  return (
    <>
      <Head>
        <title>Tạo đơn hàng | Admin Dola Bakery</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      {/* Toast */}
      {!!toast && (
        <div className="fixed left-1/2 top-4 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow animate-fadeIn z-50">
          {toast}
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tạo đơn hàng mới</h1>
            <p className="text-sm text-gray-500">
              Nhập <b>Product ID</b> để tự lấy Tên + Giá; hoặc gõ tên nếu không có ID.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn kind="ghost" onClick={() => router.back()}>Huỷ</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu đơn hàng"}</Btn>
          </div>
        </header>

        {/* Khách hàng */}
        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4 animate-slideUp">
          <h2 className="text-lg font-semibold">Khách hàng</h2>

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="customer_mode"
                checked={customerMode === "existing"}
                onChange={() => setCustomerMode("existing")}
              />
              Khách hàng cũ
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="customer_mode"
                checked={customerMode === "new"}
                onChange={() => {
                  setCustomerMode("new");
                  setSelectedCustomerId("");
                  setForm((s) => ({ ...s, user_id: "", name: "", phone: "", email: "", address: "" }));
                }}
              />
              Khách hàng mới
            </label>
          </div>

          {customerMode === "existing" && (
            <div className="grid gap-3 md:grid-cols-[1fr_300px]">
              <input
                className="border rounded-xl px-3 h-10"
                placeholder="Tìm theo tên / email / SĐT"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              <select
                className="border rounded-xl px-3 h-10 bg-white shadow-sm"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                aria-label="Chọn khách hàng"
                disabled={customersLoading}
              >
                <option value="">{customersLoading ? "Đang tải khách hàng…" : "-- Chọn khách hàng --"}</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.name || c.fullname || c.username) ?? "No name"} — {c.phone || "no phone"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Khối nhập thông tin KH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border rounded-xl px-3 h-10"
              placeholder="Họ tên *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <input
              className="border rounded-xl px-3 h-10"
              placeholder="Số điện thoại *"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <input
              className="border rounded-xl px-3 h-10"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <input
              className="border rounded-xl px-3 h-10 md:col-span-2"
              placeholder="Địa chỉ *"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
            <textarea
              className="border rounded-xl px-3 py-2 md:col-span-2"
              rows={2}
              placeholder="Ghi chú (note)"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {customersLoading && (
            <div className="text-sm text-gray-500">Đang tải danh sách khách hàng…</div>
          )}
        </section>

        {/* Sản phẩm */}
        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4 animate-slideUp">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sản phẩm</h2>
            <Btn onClick={addItem}>+ Thêm sản phẩm</Btn>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border text-sm rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">Product ID</th>
                  <th className="p-2 border">Tên (nếu không có ID)</th>
                  <th className="p-2 border text-right">Đơn giá</th>
                  <th className="p-2 border text-right">Số lượng</th>
                  <th className="p-2 border text-right">Thành tiền</th>
                  <th className="p-2 border">Xoá</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, i) => {
                  const price  = Math.max(0, Number(it.price) || 0);
                  const qty    = Math.max(1, Number(it.qty)   || 1);
                  const amount = price * qty;
                  return (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="border p-1">
                        <input
                          type="number"
                          min={0}
                          value={it.product_id || ""}
                          onChange={(e) => onProductIdChange(i, e.target.value)}
                          className="w-full border rounded-lg p-1 h-9"
                          placeholder="VD: 123"
                          title="Nhập Product ID → tự lấy Tên + Giá"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          value={it.name}
                          onChange={(e) => setItem(i, "name", e.target.value)}
                          className="w-full border rounded-lg p-1 h-9"
                          placeholder="Nhập tên nếu không có Product ID"
                        />
                      </td>
                      <td className="border p-1 text-right">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setItem(i, "price", Math.max(0, Number(e.target.value)))}
                          className="w-full border rounded-lg p-1 h-9 text-right"
                          min={0}
                          step={1000}
                          title="Giá sẽ tự điền nếu có Product ID"
                        />
                      </td>
                      <td className="border p-1 text-right">
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => setItem(i, "qty", Math.max(1, Number(e.target.value)))}
                          className="w-full border rounded-lg p-1 h-9 text-right"
                          min={1}
                        />
                      </td>
                      <td className="border p-1 text-right align-middle">{vnd(amount)}</td>
                      <td className="border p-1 text-center">
                        <Btn kind="ghost" className="h-9 px-3" onClick={() => removeItem(i)} disabled={form.items.length <= 1}>
                          Xoá
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-medium">
                  <td className="p-2 border" colSpan={4}>
                    Tạm tính
                  </td>
                  <td className="p-2 border text-right">{vnd(subtotal)}</td>
                  <td className="p-2 border" />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Thanh toán / Tổng kết nhanh */}
        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-3 animate-slideUp">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Thanh toán</h2>
            <div className="text-sm text-gray-600">
              <span className="mr-2">Tổng tiền:</span>
              <span className="text-lg font-semibold">{vnd(subtotal)}</span>
            </div>
          </div>
          <select
            className="border rounded-xl px-3 h-10 bg-white md:w-60"
            value={form.payment_method}
            onChange={(e) => set("payment_method", e.target.value)}
          >
            <option value="COD">COD</option>
            <option value="Bank">Chuyển khoản</option>
            <option value="Gateway">Cổng thanh toán</option>
          </select>
        </section>

        {/* Footer actions */}
        <div className="flex gap-2">
          <Btn kind="ghost" onClick={() => router.back()}>Huỷ</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu đơn hàng"}</Btn>
        </div>
      </div>

      {/* Effects */}
      <style jsx>{`
        .animate-fadeIn { animation: fadeIn .25s ease-out both; }
        .animate-slideUp { animation: slideUp .25s ease-out both; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0; transform: translateY(6px)} to{opacity:1; transform: translateY(0)} }
      `}</style>
    </>
  );
}
