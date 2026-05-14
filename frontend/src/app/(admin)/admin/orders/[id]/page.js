"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Head from "next/head";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
const fmtDT = (s) => (s ? new Date(s).toLocaleString("vi-VN") : "—");

function StatusBadge({ value }) {
  const v = String(value ?? "").toLowerCase();
  const map = {
    pending:   "bg-yellow-100 text-yellow-800",
    processing:"bg-blue-100 text-blue-800",
    shipped:   "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const cls = map[v] || "bg-gray-100 text-gray-700";
  const text = value || "—";
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{text}</span>;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm animate-fadeIn">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="p-2 border text-left font-medium text-gray-600">{children}</th>;
}
function Td({ children, className="" }) {
  return <td className={`p-2 border ${className}`}>{children}</td>;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/orders/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || `HTTP ${res.status}`);
      setOrder(d?.data || d);
    } catch (e) {
      setErr(e?.message || "Lỗi tải đơn hàng");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xoá đơn hàng này?")) return;
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(()=> ({}));
        throw new Error(j?.message || "Xoá thất bại");
      }
      showToast("Đã xoá đơn hàng");
      router.push("/admin/orders");
    } catch (e) {
      alert(e?.message || "Lỗi xoá");
    }
  };

  // Tính lại tổng (dự phòng) nếu API không trả sẵn `total`
  const computedTotal = useMemo(() => {
    const details = Array.isArray(order?.details) ? order.details : [];
    const sum = details.reduce((s, d) => {
      const amount = d.amount ?? (Number(d.price || 0) * Number(d.qty || 0));
      const disc = d.discount ?? 0;
      return s + Math.max(0, Number(amount) - Number(disc));
    }, 0);
    return Number(order?.total ?? sum);
  }, [order]);

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <>
        <Head><title>Đơn hàng #{id} - Admin</title></Head>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} className="h-20 bg-white border rounded-xl shadow-sm animate-pulse" />
            ))}
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({length:8}).map((_,i)=>(
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="h-6 w-40 bg-gray-100 rounded mb-3 animate-pulse" />
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
        <Head><title>Đơn hàng #{id} - Admin</title></Head>
        <div className="p-6 space-y-4">
          <div className="text-red-600 font-medium">Không tìm thấy đơn hàng</div>
          {err && <div className="text-sm text-red-500">{err}</div>}
          <button onClick={()=>router.push("/admin/orders")} className="px-4 py-2 border rounded-lg">← Quay lại</button>
        </div>
      </>
    );
  }

  const statusText = order.status_text || order.status || "—";
  const items = Array.isArray(order.details) ? order.details : [];
  const customerName = order.name || order.customer_name || order.user?.name || "—";

  return (
    <>
      <Head><title>Đơn hàng #{id} - Admin</title></Head>

      {/* Toast */}
      {!!toast && (
        <div className="fixed left-1/2 top-4 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow animate-fadeIn z-50">
          {toast}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Đơn hàng #{id}</h1>
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
              <StatusBadge value={String(statusText).toLowerCase()} />
              {String(order?.status_text || order?.status || '').toLowerCase() === 'cancelled' && String(order?.canceled_by||'').toLowerCase() === 'customer' && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">
                  Khách hàng huỷ
                </span>
              )}
              <span className="text-gray-400">•</span>
              <span>Ngày đặt: {fmtDT(order.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/orders/${id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sửa
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
            >
              Xoá
            </button>
            <button
              onClick={() => router.push("/admin/orders")}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Quay lại
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard label="Khách hàng" value={customerName} />
          <StatCard label="Tổng tiền" value={vnd(computedTotal)} />
          <StatCard label="Phương thức" value={order.payment_method || "—"} />
        </div>

        {/* Block: Thông tin */}
        <div className="bg-white p-6 rounded-xl border shadow-sm animate-slideUp">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Họ tên" value={customerName} />
            <Field label="Số điện thoại" value={order.phone || "—"} />
            <Field label="Email" value={order.email || "—"} />
            <Field label="Trạng thái" value={<div className="flex items-center gap-2"><StatusBadge value={String(statusText).toLowerCase()} />{String(order?.status_text || order?.status || '').toLowerCase() === 'cancelled' && String(order?.canceled_by||'').toLowerCase() === 'customer' && (<span className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">Khách hàng huỷ</span>)}</div>} raw />
            <div className="md:col-span-2">
              <Field label="Địa chỉ giao" value={order.address || "—"} />
            </div>
            {order.note && (
              <div className="md:col-span-2">
                <Field label="Ghi chú" value={order.note} />
              </div>
            )}
            {String(order?.status_text || order?.status || '').toLowerCase() === 'cancelled' && order?.cancel_reason && (
              <div className="md:col-span-2">
                <Field label="Lý do huỷ (KH)" value={order.cancel_reason} />
              </div>
            )}
          </div>
        </div>

        {/* Block: Sản phẩm */}
        <div className="bg-white p-6 rounded-xl border shadow-sm animate-slideUp">
          <h2 className="font-semibold mb-3">Sản phẩm</h2>
          {items.length === 0 ? (
            <p className="text-gray-500">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Tên SP</Th>
                    <Th>SL</Th>
                    <Th>Giá</Th>
                    <Th>Giảm</Th>
                    <Th>Tạm tính</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it, idx) => {
                    const price = Number(it.price || 0);
                    const qty = Number(it.qty || 0);
                    const amount = it.amount ?? price * qty;
                    const disc = Number(it.discount || 0);
                    const line = Math.max(0, Number(amount) - disc);
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <Td className="font-medium">{it.name || `SP #${idx+1}`}</Td>
                        <Td>{qty}</Td>
                        <Td>{vnd(price)}</Td>
                        <Td>{disc ? vnd(disc) : "—"}</Td>
                        <Td className="font-semibold">{vnd(line)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tổng kết */}
          <div className="mt-4 grid sm:grid-cols-[1fr_auto] items-center">
            <div />
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-gray-700">
                <span>Tạm tính</span>
                <span>{vnd(items.reduce((s, it) => s + (Number(it.amount ?? (it.price||0)*(it.qty||0)) || 0), 0))}</span>
              </div>
              {/* Nếu bạn có phí ship/giảm giá toàn đơn, render thêm tại đây */}
              <div className="mt-2 border-t pt-2 flex justify-between text-lg font-semibold">
                <span>Tổng cộng</span>
                <span>{vnd(computedTotal)}</span>
              </div>
            </div>
          </div>
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

/* ---------- Small UI ---------- */
function Field({ label, value, raw }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-gray-900">{raw ? value : (value ?? "—")}</div>
    </div>
  );
}
