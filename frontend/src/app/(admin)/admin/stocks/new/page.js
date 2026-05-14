"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/,"");
const API  = "/api/v1";
const KEY  = "admin_token";

const money = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN") + " đ";
const cx = (...xs) => xs.filter(Boolean).join(" ");

async function jfetch(url, opt = {}) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(url, {
    method: opt.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    cache: "no-store",
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data ?? {};
}

export default function StockNewPage() {
  const router = useRouter();

  // Header
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  // Items
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [adding, setAdding] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Search products
  useEffect(() => {
    const h = setTimeout(async () => {
      if (!q.trim()) { setSuggests([]); return; }
      try {
        const u = new URL(`${BASE}${API}/products`);
        u.searchParams.set("status", "1");
        u.searchParams.set("q", q.trim());
        u.searchParams.set("per_page", "10");
        const j = await jfetch(u.toString());
        const arr = Array.isArray(j?.data) ? j.data : [];
        setSuggests(arr);
      } catch {
        setSuggests([]);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [q]);

  function addItem(product) {
    if (!product || items.some(i => i.product_id === product.id)) {
      return;
    }
    setItems([...items, {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      price: String(product.price_buy || 0),
      qty: "1",
    }]);
    setQ("");
    setAdding(false);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index, key, value) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    setItems(newItems);
  }

  async function submit() {
    if (items.length === 0) {
      alert("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }
    if (!warehouse) {
      alert("Vui lòng nhập tên kho");
      return;
    }
    
    setSubmitting(true);
    try {
      await jfetch(`${BASE}${API}/stock-ins`, {
        method: "POST",
        body: {
          date,
          warehouse,
          supplier: supplier || null,
          note: note || null,
          status: 0, // Nháp
          items: items.map(i => ({
            product_id: i.product_id,
            qty: Number(i.qty) || 1,
            price: Number(i.price) || 0,
          })),
        },
      });
      router.push("/admin/stocks");
    } catch (err) {
      alert("❌ " + err.message);
      setSubmitting(false);
    }
  }

  const totalQty = items.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const totalCost = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tạo phiếu nhập kho</h1>
          <p className="text-sm text-gray-500">Quản lý nhập hàng vào kho</p>
        </div>
        <Link href="/admin/stocks" className="px-3 py-2 border rounded-lg hover:bg-gray-100">
          ← Quay lại
        </Link>
      </div>

      {/* Header */}
      <div className="grid md:grid-cols-3 gap-3 bg-white border rounded-2xl p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ngày</label>
          <input
            type="date"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kho *</label>
          <input
            value={warehouse}
            onChange={(e)=>setWarehouse(e.target.value)}
            placeholder="vd: Kho Hà Nội"
            className="w-full h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nhà cung cấp</label>
          <input
            value={supplier}
            onChange={(e)=>setSupplier(e.target.value)}
            placeholder="vd: Cty ABC"
            className="w-full h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e)=>setNote(e.target.value)}
            placeholder="Ghi chú cho phiếu nhập (không bắt buộc)"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      </div>

      {/* Add product */}
      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Thêm sản phẩm</h2>
          <button
            onClick={() => setAdding(!adding)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            <Plus size={18} />
            Thêm dòng
          </button>
        </div>

        {adding && (
          <div className="space-y-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nhập tên hoặc SKU sản phẩm…"
              className="w-full h-10 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            {suggests.length > 0 && (
              <div className="max-h-48 overflow-auto border rounded-xl divide-y bg-white">
                {suggests.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => addItem(p)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(p.thumbnail || p.image || "").startsWith("http")
                        ? (p.thumbnail || p.image)
                        : `${BASE}${API}/storage/${String(p.thumbnail || p.image || "").replace(/^storage\//,"")}`}
                      alt=""
                      className="w-8 h-8 rounded object-cover border"
                      onError={(e) => (e.currentTarget.src = "/file.svg")}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">SKU: {p.sku || "—"}</div>
                    </div>
                    <div className="text-xs text-gray-600">{money(p.price_buy)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items table */}
        {items.length > 0 && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Sản phẩm</th>
                  <th className="p-2 text-center">SL</th>
                  <th className="p-2 text-left">Giá nhập</th>
                  <th className="p-2 text-left">Thành tiền</th>
                  <th className="p-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-gray-500">SKU: {item.product_sku || "—"}</div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        className="w-20 h-9 border rounded px-2"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        className="w-32 h-9 border rounded px-2"
                      />
                    </td>
                    <td className="p-2 font-medium">
                      {money((Number(item.price) || 0) * (Number(item.qty) || 0))}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={3} className="p-2 font-semibold text-right">Tổng cộng:</td>
                  <td className="p-2 font-bold">{money(totalCost)}</td>
                  <td className="p-2 text-center text-gray-600">SL: {totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/stocks" className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          Hủy
        </Link>
        <button
          onClick={submit}
          disabled={submitting || items.length === 0 || !warehouse}
          className={cx(
            "px-4 py-2 rounded-lg text-white font-medium",
            submitting || items.length === 0 || !warehouse
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black hover:bg-gray-800"
          )}
        >
          {submitting ? "Đang lưu…" : "Lưu nháp"}
        </button>
      </div>
    </div>
  );
}
