
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

export default function StockInDetailPage() {
  const router = useRouter();
  const params = useParams();                  // { id: '1' }
  const id = useMemo(() => String(params?.id || "").trim(), [params]);
  const [data, setData] = useState(null);      // stock-in header + items
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const j = await jfetch(`${BASE}${API}/stock-ins/${id}`);
      setData(j || null);
    } catch (e) {
      setErr(e.message || "Không tải được dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function onDelete() {
    if (!confirm("Xoá phiếu nhập này? Thao tác không thể hoàn tác.")) return;
    setDeleting(true);
    try {
      await jfetch(`${BASE}${API}/stock-ins/${id}`, { method: "DELETE" });
      router.push("/admin/stocks");
    } catch (e) {
      alert("❌ " + (e.message || "Xoá thất bại"));
      setDeleting(false);
    }
  }

  async function onConfirm() {
    if (!confirm("Xác nhận phiếu nhập này? Hệ thống sẽ cộng tồn kho cho các sản phẩm.")) return;
    setConfirming(true);
    try {
      await jfetch(`${BASE}${API}/stock-ins/${id}/confirm`, { method: "POST" });
      alert("✅ Đã xác nhận phiếu nhập!");
      load();
    } catch (e) {
      alert("❌ " + (e.message || "Xác nhận thất bại"));
      setConfirming(false);
    }
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const totalQty = data?.total_qty || items.reduce((s,x)=>s + (Number(x.qty)||0), 0);
  const totalCost = data?.total_cost ?? items.reduce((s,x)=>s + (Number(x.amount)||Number(x.qty)*Number(x.price)||0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chi tiết phiếu nhập</h1>
          <p className="text-sm text-gray-500">Xem thông tin & các dòng hàng của phiếu</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/stocks" className="px-3 py-2 border rounded-lg hover:bg-gray-100">← Quay lại</Link>
          {data?.status === 0 && (
            <button
              onClick={onConfirm}
              disabled={confirming}
              className={cx(
                "px-3 py-2 rounded-lg text-white",
                confirming ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
              )}
            >
              {confirming ? "Đang xác nhận…" : "Xác nhận phiếu"}
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={deleting || data?.status === 1}
            className={cx(
              "px-3 py-2 rounded-lg text-white",
              deleting ? "bg-gray-400" : "bg-red-600 hover:bg-red-700",
              data?.status === 1 && "opacity-50 cursor-not-allowed"
            )}
          >
            {deleting ? "Đang xoá…" : "Xoá phiếu"}
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="p-6 bg-white border rounded-xl text-gray-500">Đang tải dữ liệu…</div>
      )}
      {!loading && err && (
        <div className="p-6 bg-white border rounded-xl text-red-600">Lỗi: {err}</div>
      )}

      {/* Content */}
      {!loading && !err && data && (
        <>
          {/* Summary */}
          <div className="grid md:grid-cols-4 gap-4 bg-white border rounded-2xl p-4">
            <div>
              <div className="text-xs text-gray-500">Mã phiếu</div>
              <div className="font-semibold">{data.code}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày</div>
              <div className="font-semibold">{data.date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Kho</div>
              <div className="font-semibold">{data.warehouse || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Trạng thái</div>
              <div className="font-semibold">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  data.status === 1 
                    ? "bg-green-100 text-green-700" 
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {data.status === 1 ? "Đã xác nhận" : "Nháp"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Nhà cung cấp</div>
              <div className="font-semibold">{data.supplier || "—"}</div>
            </div>
            <div className="text-right md:text-left">
              <div className="text-xs text-gray-500">Tổng SL / Tổng tiền</div>
              <div className="font-semibold">{totalQty} / {money(totalCost)}</div>
            </div>
            <div className="md:col-span-4">
              <div className="text-xs text-gray-500">Ghi chú</div>
              <div className="">{data.note || "—"}</div>
            </div>
            {data.confirmed_at && (
              <div className="md:col-span-4 text-xs text-gray-400">
                Xác nhận lúc: {new Date(data.confirmed_at).toLocaleString("vi-VN")}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white border rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Sản phẩm</th>
                  <th className="p-3 text-left">Mã SP</th>
                  <th className="p-3 text-left">SL</th>
                  <th className="p-3 text-left">Giá</th>
                  <th className="p-3 text-left">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Không có dòng nào</td></tr>
                )}
                {items.map((it) => {
                  const p = it.product || {};
                  const img = (p.thumbnail || p.image || "");
                  const src = img.startsWith("http")
                    ? img
                    : img
                      ? `${BASE}${API}/storage/${String(img).replace(/^storage\//,"")}`
                      : "/file.svg";
                  return (
                    <tr key={it.id || `${it.product_id}-${it.price}-${it.qty}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-9 h-9 rounded object-cover border" onError={(e)=>e.currentTarget.src="/file.svg"} />
                          <div>
                            <div className="font-medium">{p.name || `#${it.product_id}`}</div>
                            {p.slug && <div className="text-xs text-gray-500">{p.slug}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{p.code || p.sku || "—"}</td>
                      <td className="p-3">{it.qty}</td>
                      <td className="p-3">{money(it.price)}</td>
                      <td className="p-3">{money(it.amount ?? (Number(it.qty)*Number(it.price)))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer totals */}
            <div className="flex items-center justify-end gap-6 px-4 py-3 border-t text-sm">
              <div>Tổng SL: <b>{totalQty}</b></div>
              <div>Tổng tiền: <b>{money(totalCost)}</b></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
