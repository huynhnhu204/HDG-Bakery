"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function StockInEditPage() {
  const router = useRouter();
  const params = useParams(); // { id: '1' }
  const id = useMemo(() => String(params?.id || "").trim(), [params]);

  // Header stock-in
  const [header, setHeader]   = useState(null);
  const [loadingH, setLoadingH] = useState(true);
  const [errH, setErrH]       = useState("");

  // Lines from product_store (ref to this stock-in)
  const [lines, setLines]     = useState([]); // [{ id, product_id, price_root, qty, note, ... }]
  const [loadingL, setLoadingL] = useState(true);
  const [errL, setErrL]       = useState("");

  // Local edit state for lines
  const [savingId, setSavingId]   = useState(0);
  const [deletingId, setDeletingId] = useState(0);

  async function loadHeader() {
    setLoadingH(true);
    setErrH("");
    try {
      const j = await jfetch(`${BASE}${API}/stock-ins/${id}`);
      setHeader(j || null);
    } catch (e) {
      setErrH(e.message || "Không tải được phiếu nhập");
      setHeader(null);
    } finally {
      setLoadingH(false);
    }
  }

  async function loadLines() {
    setLoadingL(true);
    setErrL("");
    try {
      const u = new URL(`${BASE}${API}/product-store`);
      u.searchParams.set("ref_type", "STOCK_IN");
      u.searchParams.set("ref_id", id);
      u.searchParams.set("per_page", "100");
      const j = await jfetch(u.toString());
      const data = Array.isArray(j?.data) ? j.data : [];
      // chuẩn hoá state edit (clone)
      const mapped = data.map(x => ({
        ...x,
        _price_root: String(x.price_root ?? 0),
        _qty: String(x.qty ?? 0),
        _note: String(x.note ?? ""),
      }));
      setLines(mapped);
    } catch (e) {
      setErrL(e.message || "Không tải được danh sách dòng nhập");
      setLines([]);
    } finally {
      setLoadingL(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadHeader();
    loadLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setLineField(pid, key, val) {
    setLines(prev => prev.map(x => x.id === pid ? { ...x, [key]: val } : x));
  }

  async function saveLine(row) {
    if (!row?.id) return;
    setSavingId(row.id);
    try {
      const payload = {
        price_root: Number(row._price_root),
        qty: Number(row._qty),
        note: row._note || null,
      };
      await jfetch(`${BASE}${API}/product-store/${row.id}`, {
        method: "PATCH",
        body: payload,
      });
      // reload lines để đồng bộ số liệu tính toán
      await loadLines();
    } catch (e) {
      alert("❌ Lưu dòng thất bại: " + e.message);
    } finally {
      setSavingId(0);
    }
  }

  async function deleteLine(row) {
    if (!row?.id) return;
    if (!confirm("Xoá (soft) dòng này?")) return;
    setDeletingId(row.id);
    try {
      await jfetch(`${BASE}${API}/product-store/${row.id}`, { method: "DELETE" });
      await loadLines();
    } catch (e) {
      alert("❌ Xoá dòng thất bại: " + e.message);
    } finally {
      setDeletingId(0);
    }
  }

  const totalQty  = lines.reduce((s,x)=> s + (Number(x._qty) || Number(x.qty) || 0), 0);
  const totalCost = lines.reduce((s,x)=> {
    const price = Number(x._price_root ?? x.price_root ?? 0);
    const qty   = Number(x._qty ?? x.qty ?? 0);
    return s + price * qty;
  }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sửa phiếu nhập</h1>
          <p className="text-sm text-gray-500">Chỉnh sửa các dòng nhập thuộc phiếu</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/stocks/${id}`} className="px-3 py-2 border rounded-lg hover:bg-gray-100">
            ← Xem chi tiết
          </Link>
          <Link href="/admin/stocks" className="px-3 py-2 border rounded-lg hover:bg-gray-100">
            Danh sách
          </Link>
        </div>
      </div>

      {/* Header info (read-only) */}
      <div className="bg-white border rounded-2xl p-4">
        {loadingH ? (
          <div className="text-gray-500">Đang tải thông tin phiếu…</div>
        ) : errH ? (
          <div className="text-red-600">Lỗi: {errH}</div>
        ) : header ? (
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Mã phiếu</div>
              <div className="font-semibold">{header.code}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày</div>
              <div className="font-semibold">{header.date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Nhà cung cấp</div>
              <div className="font-semibold">{header.supplier || "—"}</div>
            </div>
            <div className="md:text-right">
              <div className="text-xs text-gray-500">Tổng hiện tại</div>
              <div className="font-semibold">{totalQty} / {money(totalCost)}</div>
            </div>
            <div className="md:col-span-4">
              <div className="text-xs text-gray-500">Ghi chú phiếu</div>
              <div>{header.note || "—"}</div>
              <div className="text-xs text-gray-400 mt-2">
                (* Header đang chỉ đọc do chưa có endpoint update stock-in.)
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Editable lines */}
      <div className="bg-white border rounded-2xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Sản phẩm</th>
              <th className="p-3 text-left">SL</th>
              <th className="p-3 text-left">Giá nhập</th>
              <th className="p-3 text-left">Ghi chú dòng</th>
              <th className="p-3 text-right">Thành tiền</th>
              <th className="p-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loadingL && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải dòng…</td></tr>
            )}
            {!loadingL && errL && (
              <tr><td colSpan={6} className="p-8 text-center text-red-600">Lỗi: {errL}</td></tr>
            )}
            {!loadingL && !errL && lines.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Không có dòng nào</td></tr>
            )}
            {!loadingL && !errL && lines.map((r) => {
              const price = Number(r._price_root ?? r.price_root ?? 0);
              const qty   = Number(r._qty ?? r.qty ?? 0);
              const amount = price * qty;
              const p = r.product || {};
              const img = (p.thumbnail || p.image || "");
              const src = img.startsWith("http")
                ? img
                : img
                  ? `${BASE}${API}/storage/${String(img).replace(/^storage\//,"")}`
                  : "/file.svg";
              return (
                <tr key={r.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-9 h-9 rounded object-cover border" onError={(e)=>e.currentTarget.src="/file.svg"} />
                      <div>
                        <div className="font-medium">{p.name || `#${r.product_id}`}</div>
                        <div className="text-xs text-gray-500">{p.slug || p.code || p.sku || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={r._qty}
                      onChange={(e)=>setLineField(r.id, "_qty", e.target.value)}
                      className="w-24 h-9 border rounded px-2"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={r._price_root}
                      onChange={(e)=>setLineField(r.id, "_price_root", e.target.value)}
                      className="w-32 h-9 border rounded px-2"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={r._note}
                      onChange={(e)=>setLineField(r.id, "_note", e.target.value)}
                      className="w-64 h-9 border rounded px-2"
                      placeholder="Ghi chú cho dòng…"
                    />
                  </td>
                  <td className="p-3 text-right">{money(amount)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={()=>saveLine(r)}
                        disabled={savingId === r.id}
                        className={cx(
                          "px-3 py-1.5 rounded border",
                          savingId === r.id ? "bg-gray-200 text-gray-500" : "hover:bg-gray-100"
                        )}
                      >
                        {savingId === r.id ? "Đang lưu…" : "Lưu"}
                      </button>
                      <button
                        onClick={()=>deleteLine(r)}
                        disabled={deletingId === r.id}
                        className={cx(
                          "px-3 py-1.5 rounded text-white",
                          deletingId === r.id ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
                        )}
                      >
                        {deletingId === r.id ? "Đang xoá…" : "Xoá"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex items-center justify-end gap-6 px-4 py-3 border-t text-sm">
          <div>Tổng SL: <b>{totalQty}</b></div>
          <div>Tổng tiền: <b>{money(totalCost)}</b></div>
        </div>
      </div>
    </div>
  );
}
