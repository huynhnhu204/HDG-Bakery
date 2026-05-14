"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Head from "next/head";

/* ====== Config ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/* ====== Helpers ====== */
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
function headersJSON() {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}
function headersForm() {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  return { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store", headers: headersForm() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function callJSON(url, method, body) {
  const r = await fetch(url, { method, headers: headersJSON(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.text()) || `${r.status} ${r.statusText}`);
  return r.json();
}

/* Map status giống BE (0..4) */
const STATUS = [
  { v: 0, label: "Mới tạo" },
  { v: 1, label: "Đang xử lý" },
  { v: 2, label: "Đang giao" },
  { v: 3, label: "Hoàn tất" },
  { v: 4, label: "Đã huỷ" },
];

function StatusBadge({ value }) {
  const s = String(value ?? "").toLowerCase();
  const map = {
    "0": "bg-yellow-100 text-yellow-800",
    "1": "bg-blue-100 text-blue-800",
    "2": "bg-purple-100 text-purple-800",
    "3": "bg-green-100 text-green-800",
    "4": "bg-red-100 text-red-800",
    "mới tạo": "bg-yellow-100 text-yellow-800",
    "đang xử lý": "bg-blue-100 text-blue-800",
    "đang giao": "bg-purple-100 text-purple-800",
    "hoàn tất": "bg-green-100 text-green-800",
    "đã huỷ": "bg-red-100 text-red-800",
  };
  const label =
    STATUS.find((x) => String(x.v) === s)?.label ||
    STATUS.find((x) => x.label.toLowerCase() === s)?.label ||
    value ||
    "—";
  const cls = map[s] || "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

/* ====== Page ====== */
export default function OrderEditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [order, setOrder] = useState(null); // {id, name, phone, ...}
  const [items, setItems] = useState([]);   // details rows

  // Form (có thể sửa)
  const [f, setF] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    payment_method: "COD",
    status: 0,
  });

  // Toast
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) Lấy đơn
        const od = await getJSON(`${BASE}${API}/orders/${id}`);
        // 2) Lấy chi tiết đơn: ưu tiên endpoint đã có trong BE: /orders/{id}/details
        let rows = [];
        try {
          const byOrder = await getJSON(`${BASE}${API}/orders/${id}/details`);
          rows = Array.isArray(byOrder) ? byOrder : [];
        } catch {
          // fallback nếu bạn có /order-details?order_id=
          try {
            const det = await getJSON(`${BASE}${API}/order-details?order_id=${id}&per_page=9999`);
            rows = Array.isArray(det?.data) ? det.data : Array.isArray(det) ? det : [];
          } catch {}
        }

        if (!alive) return;
        setOrder(od?.data || od);
        setItems(rows);

        const odData = od?.data || od || {};
        setF({
          name: odData.name || "",
          phone: odData.phone || "",
          email: odData.email || "",
          address: odData.address || "",
          note: odData.note || "",
          payment_method: odData.payment_method || "COD",
          status: Number(odData.status ?? 0),
        });
      } catch (e) {
        setErr("Lỗi tải đơn: " + (e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + Number(it.amount ?? (Number(it.price ?? 0) * Number(it.qty ?? 0))),
        0
      ),
    [items]
  );
  const discount = useMemo(
    () => items.reduce((s, it) => s + Number(it.discount || 0), 0),
    [items]
  );
  const total = Math.max(0, subtotal - discount);

  async function saveInfo() {
    // Validate nhẹ
    if (!f.name.trim()) return alert("Vui lòng nhập Họ tên");
    if (!f.phone.trim()) return alert("Vui lòng nhập Số điện thoại");
    if (!f.address.trim()) return alert("Vui lòng nhập Địa chỉ");

    try {
      setSaving(true);
      const resp = await callJSON(`${BASE}${API}/orders/${id}`, "PUT", {
        name: f.name,
        phone: f.phone,
        email: f.email || null,
        address: f.address,
        note: f.note || null,
        payment_method: f.payment_method || "COD",
        status: f.status,
      });
      setOrder((o) => ({ ...(o || {}), ...(resp?.data || resp) }));
      showToast("Đã lưu thông tin đơn");
    } catch (e) {
      alert("Lỗi lưu: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  // thao tác với từng dòng chi tiết
  const setItem = (i, k, v) =>
    setItems((s) => {
      const next = [...s];
      next[i] = { ...next[i], [k]: v };
      // tự tính amount nếu sửa price/qty
      if (k === "price" || k === "qty") {
        const price = Number(next[i].price ?? 0);
        const qty = Number(next[i].qty ?? 0);
        next[i].amount = price * qty;
      }
      return next;
    });

  async function addRow() {
    try {
      const body = {
        order_id: Number(id),
        product_id: null,
        name: "Sản phẩm mới",
        price: 0,
        qty: 1,
        discount: 0,
      };
      const created = await callJSON(`${BASE}${API}/order-details`, "POST", body);
      setItems((s) => [...s, created?.data || created]);
      showToast("Đã thêm sản phẩm");
    } catch (e) {
      alert("Thêm dòng thất bại: " + (e?.message || e));
    }
  }

  async function saveRow(row, idx) {
    try {
      const payload = {
        product_id: row.product_id || null,
        name: row.name || null,
        price: Number(row.price || 0),
        qty: Math.max(1, Number(row.qty || 1)),
        discount: Number(row.discount || 0),
      };
      const saved = await callJSON(`${BASE}${API}/order-details/${row.id}`, "PUT", payload);
      setItems((s) => {
        const next = [...s];
        next[idx] = saved?.data || saved;
        return next;
      });
      showToast("Đã lưu dòng");
    } catch (e) {
      alert("Lưu dòng thất bại: " + (e?.message || e));
    }
  }

  async function removeRow(rowId) {
    if (!confirm("Xoá sản phẩm này khỏi đơn?")) return;
    try {
      const r = await fetch(`${BASE}${API}/order-details/${rowId}`, {
        method: "DELETE",
        headers: headersForm(),
      });
      if (!r.ok) throw new Error(await r.text());
      setItems((s) => s.filter((x) => x.id !== rowId));
      showToast("Đã xoá sản phẩm");
    } catch (e) {
      alert("Xoá thất bại: " + (e?.message || e));
    }
  }

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <>
        <Head>
          <title>Sửa đơn #{id} | Admin</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-20 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="grid md:grid-cols-2 gap-3">
              {Array.from({length:7}).map((_,i)=>(
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
              <div className="md:col-span-2 h-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-40 bg-gray-50 rounded animate-pulse" />
          </div>

          <style jsx>{`
            .animate-pulse { animation: pulse 1.4s ease-in-out infinite; }
            @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
          `}</style>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Head>
          <title>Sửa đơn #{id} | Admin</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="p-6 space-y-4">
          <div className="text-red-600 font-medium">Không tìm thấy đơn hàng.</div>
          {err && <div className="text-sm text-red-500">{err}</div>}
          <button onClick={()=>router.push("/admin/orders")} className="border px-4 h-10 rounded-xl">
            ← Quay lại
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sửa đơn #{order.id} | Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      {/* Toast */}
      {!!toast && (
        <div className="fixed left-1/2 top-4 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow animate-fadeIn z-50">
          {toast}
        </div>
      )}
      {!!err && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sửa đơn hàng #{order.id}</h1>
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
              <StatusBadge value={String(order.status ?? 0)} />
              <span className="text-gray-400">•</span>
              <span>Ngày đặt: {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/admin/orders/${id}`)} className="border px-4 h-10 rounded-xl hover:bg-gray-50">
              Xem
            </button>
            <button onClick={() => router.push("/admin/orders")} className="border px-4 h-10 rounded-xl hover:bg-gray-50">
              Quay lại
            </button>
          </div>
        </div>

        {/* Thông tin chung */}
        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4 animate-slideUp">
          <h2 className="text-lg font-semibold">Thông tin đơn</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Họ tên *" value={f.name} onChange={(v)=>setF(s=>({...s,name:v}))} required />
            <Input label="Số điện thoại *" value={f.phone} onChange={(v)=>setF(s=>({...s,phone:v}))} required />
            <Input label="Email" value={f.email} onChange={(v)=>setF(s=>({...s,email:v}))} type="email" />
            <Select
              label="Phương thức"
              value={f.payment_method}
              onChange={(v)=>setF(s=>({...s,payment_method:v}))}
              options={[
                {value:"COD", label:"COD"},
                {value:"Bank", label:"Chuyển khoản"},
                {value:"Gateway", label:"Cổng thanh toán"},
              ]}
            />
            <Input className="md:col-span-2" label="Địa chỉ *" value={f.address} onChange={(v)=>setF(s=>({...s,address:v}))} />
            <TextArea className="md:col-span-2" label="Ghi chú" value={f.note} onChange={(v)=>setF(s=>({...s,note:v}))} rows={2} />
            <Select
              label="Trạng thái"
              value={String(f.status)}
              onChange={(v)=>setF(s=>({...s,status:Number(v)}))}
              options={STATUS.map(s=>({value:String(s.v), label:s.label}))}
            />
          </div>

          <div className="pt-2">
            <button onClick={saveInfo} disabled={saving} className="px-4 h-10 rounded-xl bg-black text-white hover:opacity-90 active:translate-y-[1px] disabled:opacity-60">
              {saving ? "Đang lưu…" : "Lưu thông tin"}
            </button>
          </div>
        </section>

        {/* Chi tiết sản phẩm */}
        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4 animate-slideUp">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sản phẩm trong đơn</h2>
            <button onClick={addRow} className="px-4 h-10 rounded-xl bg-black text-white hover:opacity-90 active:translate-y-[1px]">
              + Thêm dòng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Product ID</Th>
                  <Th>Tên</Th>
                  <Th className="text-right">Đơn giá</Th>
                  <Th className="text-right">SL</Th>
                  <Th className="text-right">Giảm</Th>
                  <Th className="text-right">Thành tiền</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const amount = Number(it.amount ?? (Number(it.price ?? 0) * Number(it.qty ?? 0)));
                  return (
                    <tr key={it.id} className="border-t hover:bg-gray-50/60 transition">
                      <Td>
                        <input
                          type="number"
                          value={it.product_id ?? ""}
                          onChange={(e) =>
                            setItem(i, "product_id", e.target.value ? Number(e.target.value) : null)
                          }
                          className="h-9 w-28 rounded-lg border px-2"
                          placeholder="ID"
                        />
                      </Td>
                      <Td>
                        <input
                          value={it.name || ""}
                          onChange={(e) => setItem(i, "name", e.target.value)}
                          className="h-9 w-full rounded-lg border px-2"
                          placeholder="Tên sản phẩm"
                        />
                      </Td>
                      <Td className="text-right">
                        <input
                          type="number"
                          value={Number(it.price ?? 0)}
                          onChange={(e) => setItem(i, "price", Math.max(0, Number(e.target.value)))}
                          className="h-9 w-28 rounded-lg border px-2 text-right"
                          min={0}
                          step={1000}
                        />
                      </Td>
                      <Td className="text-right">
                        <input
                          type="number"
                          value={Number(it.qty ?? 1)}
                          onChange={(e) => setItem(i, "qty", Math.max(1, Number(e.target.value)))}
                          className="h-9 w-20 rounded-lg border px-2 text-right"
                          min={1}
                        />
                      </Td>
                      <Td className="text-right">
                        <input
                          type="number"
                          value={Number(it.discount ?? 0)}
                          onChange={(e) => setItem(i, "discount", Math.max(0, Number(e.target.value)))}
                          className="h-9 w-28 rounded-lg border px-2 text-right"
                          min={0}
                          step={1000}
                        />
                      </Td>
                      <Td className="text-right font-semibold">{vnd(amount)}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveRow(items[i], i)}
                            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => removeRow(it.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
                          >
                            Xoá
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {/* Tổng kết */}
                <tr className="bg-gray-50 font-medium">
                  <Td className="text-right" colSpan={4}>Tạm tính</Td>
                  <Td className="text-right">− {vnd(discount)}</Td>
                  <Td className="text-right">{vnd(subtotal)}</Td>
                  <Td />
                </tr>
                <tr className="font-bold">
                  <Td className="text-right" colSpan={5}>Tổng cộng</Td>
                  <Td className="text-right">{vnd(total)}</Td>
                  <Td />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer actions */}
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="border px-4 h-10 rounded-xl hover:bg-gray-50">
            Huỷ
          </button>
          <button onClick={saveInfo} className="px-4 h-10 rounded-xl bg-black text-white hover:opacity-90 active:translate-y-[1px]">
            Lưu tất cả
          </button>
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

/* ====== Small UI ====== */
function Th({ children, className="" }) {
  return <th className={`px-3 py-2 text-left font-medium text-gray-600 ${className}`}>{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function Input({ label, value, onChange, type="text", className="", required }) {
  return (
    <label className={`${className} block`}>
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        required={required}
        className="h-10 w-full rounded-xl border px-3 outline-none focus:ring-2 focus:ring-orange-300"
      />
    </label>
  );
}
function TextArea({ label, value, onChange, rows=3, className="" }) {
  return (
    <label className={`${className} block`}>
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
      />
    </label>
  );
}
function Select({ label, value, onChange, options, className="" }) {
  return (
    <label className={`${className} block`}>
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      <select
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="h-10 w-full rounded-xl border px-3 bg-white outline-none focus:ring-2 focus:ring-orange-300"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}
