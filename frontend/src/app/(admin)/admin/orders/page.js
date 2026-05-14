"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2, Plus, RefreshCw, Search } from "lucide-react";

/* ================== Config ================== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/* ================== Helpers ================== */
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";

async function call(url, opts = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  const headers = {
    Accept: "application/json",
    ...(opts.body && typeof opts.body === "string" ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(url, { cache: "no-store", ...opts, headers });
  let text = "";
  try { text = await res.text(); } catch { text = ""; }

  let data = {};
  if (text) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    try { data = JSON.parse(text); } catch { data = isJson ? {} : {}; }
  }

  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

function StatusBadge({ status }) {
  const s = (status || "").toString().toLowerCase();
  const color =
    {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }[s] || "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status || "—"}</span>;
}

function CardStat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm animate-fadeIn">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

/* ================== Main Page ================== */
export default function OrdersAdminPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // Bộ lọc
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    minTotal: "",
    maxTotal: "",
  });
  const setFilter = (k, v) => setFilters((s) => ({ ...s, [k]: v }));

  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Gọi API (có truyền query nếu BE hỗ trợ). Dù sao cũng có lọc client-side dự phòng.
  const refresh = async (override = {}) => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        per_page: "50",
        // các tham số sau nếu BE có hỗ trợ thì sẽ lọc ở server
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
        ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
        ...(filters.minTotal ? { min_total: filters.minTotal } : {}),
        ...(filters.maxTotal ? { max_total: filters.maxTotal } : {}),
        ...override,
      }).toString();

      const data = await call(`${BASE}${API}/orders?${q}`);
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRows(arr);
    } catch (e) {
      console.error("Load orders:", e.message || e);
      setError(e.message || "Không thể tải danh sách đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []); // initial

  // Debounce tìm kiếm & bộ lọc
  useEffect(() => {
    const t = setTimeout(() => refresh(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status, filters.dateFrom, filters.dateTo, filters.minTotal, filters.maxTotal]);

  const viewHref = (o) => `/admin/orders/${o.id}`;
  const editHref = (o) => `/admin/orders/${o.id}/edit`;
  const newHref = `/admin/orders/new`;

  /* ------ lọc client-side (phòng khi BE chưa hỗ trợ) ------ */
  const filteredRows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const s = (filters.status || "").toLowerCase();
    const dFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dTo = filters.dateTo ? new Date(filters.dateTo) : null;
    const minT = filters.minTotal ? Number(filters.minTotal) : null;
    const maxT = filters.maxTotal ? Number(filters.maxTotal) : null;

    return rows.filter((r) => {
      // q: so khớp id/code/name
      if (q) {
        const hay = [
          r.id,
          r.code || r.order_code,
          r.name || r.user?.name || "",
          r.phone || "",
          r.email || "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // status
      if (s) {
        const rs = (r.status_text || r.status || "").toString().toLowerCase();
        if (rs !== s) return false;
      }
      // date range (theo created_at)
      if (dFrom || dTo) {
        const d = r.created_at ? new Date(r.created_at) : null;
        if (!d) return false;
        if (dFrom && d < dFrom) return false;
        if (dTo) {
          const end = new Date(dTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
      // total range
      const total = Number(r.total || 0);
      if (minT !== null && total < minT) return false;
      if (maxT !== null && total > maxT) return false;

      return true;
    });
  }, [rows, filters]);

  /* ------ quick summary  ------ */
  const summary = useMemo(() => {
    const total = filteredRows.reduce((s, r) => s + Number(r.total || 0), 0);
    const delivered = filteredRows.filter(
      r => (r.status_text || r.status)?.toString().toLowerCase() === "delivered"
    );
    return {
      count: filteredRows.length,
      sum: total,
      deliveredCount: delivered.length,
    };
  }, [filteredRows]);

  return (
    <>
      <Head>
        <title>Đơn hàng | Admin Dola Bakery</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Trang quản lý đơn hàng Dola Bakery (khu vực quản trị)." />
      </Head>

      {/* Toast */}
      {!!toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-white shadow-2xl animate-slideDown flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{toast}</span>
        </div>
      )}
      {!!error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Đơn hàng</h1>
            <p className="text-sm text-gray-500">Theo dõi, chỉnh sửa và xử lý đơn một cách gọn gàng.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 bg-white border hover:bg-gray-50 px-3.5 h-10 rounded-xl text-sm font-medium"
              title="Làm mới"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <Link
              href={newHref}
              className="inline-flex items-center gap-2 bg-black hover:opacity-90 text-white px-3.5 h-10 rounded-xl text-sm font-medium"
            >
              <Plus size={16} /> Thêm đơn hàng
            </Link>
          </div>
        </div>

        {/* Filters */}
        <section className="bg-white rounded-xl border p-4 shadow-sm space-y-4 animate-fadeIn">
          <h2 className="font-semibold text-gray-700">Tìm kiếm & Bộ lọc</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Từ khoá</label>
              <div className="relative">
                <input
                  className="border rounded w-full px-9 py-2"
                  placeholder="Mã đơn / Tên KH / Email / SĐT…"
                  value={filters.q}
                  onChange={(e) => setFilter("q", e.target.value)}
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Trạng thái</label>
              <select
                className="border rounded w-full px-3 py-2"
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="pending">Chờ xử lý</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đã gửi</option>
                <option value="delivered">Đã giao</option>
                <option value="cancelled">Đã huỷ</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Từ ngày</label>
              <input
                type="date"
                className="border rounded w-full px-3 py-2"
                value={filters.dateFrom}
                onChange={(e) => setFilter("dateFrom", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Đến ngày</label>
              <input
                type="date"
                className="border rounded w-full px-3 py-2"
                value={filters.dateTo}
                onChange={(e) => setFilter("dateTo", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Tổng tiền tối thiểu</label>
              <input
                type="number"
                min="0"
                className="border rounded w-full px-3 py-2"
                placeholder="vd: 100000"
                value={filters.minTotal}
                onChange={(e) => setFilter("minTotal", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Tổng tiền tối đa</label>
              <input
                type="number"
                min="0"
                className="border rounded w-full px-3 py-2"
                placeholder="vd: 2000000"
                value={filters.maxTotal}
                onChange={(e) => setFilter("maxTotal", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setFilters({ q: "", status: "", dateFrom: "", dateTo: "", minTotal: "", maxTotal: "" }); refresh(); }}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Xoá bộ lọc
            </button>
            <span className="text-sm text-gray-500">Kết quả: <b>{filteredRows.length}</b> đơn</span>
          </div>
        </section>

        {/* Quick summary cards (sau khi lọc) */}
        <div className="grid sm:grid-cols-3 gap-3">
          <CardStat label="Tổng số đơn " value={summary.count} />
          <CardStat label="Tổng doanh thu " value={vnd(summary.sum)} />
          <CardStat label="Đơn đã giao " value={summary.deliveredCount} />
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden animate-slideUp">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-600">Mã</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Khách hàng</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Tổng tiền</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Trạng thái</th>
                  <th className="px-6 py-3 font-medium text-gray-600">Ngày đặt</th>
                  <th className="px-6 py-3 font-medium text-gray-600 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-8 w-24 bg-gray-100 rounded-xl ml-auto" /></td>
                    </tr>
                  ))}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                        📦
                      </div>
                      <div className="text-sm font-semibold text-gray-900">Không có đơn phù hợp bộ lọc</div>
                      <div className="text-sm text-gray-500 mt-1">Hãy thử gỡ bớt điều kiện.</div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredRows.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50/60 cursor-pointer transition"
                      onClick={() => router.push(viewHref(o))}
                    >
                      <td className="px-6 py-4 font-mono">
                        <Link href={viewHref(o)} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {o.code || o.order_code || o.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={viewHref(o)} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {o.name || o.user?.name || "—"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium">{vnd(o.total || 0)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={o.status_text || o.status} />
                          {String(o.status_text || o.status).toLowerCase() === 'cancelled' && String(o.canceled_by || '').toLowerCase() === 'customer' && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">
                              Khách hàng huỷ
                            </span>
                          )}
                          <select
                            value={o.status || 0}
                            onChange={async (e) => {
                              const newStatus = parseInt(e.target.value);
                              const oldStatus = o.status || 0;
                              if (newStatus === oldStatus) return;
                              
                              const statusNames = {
                                0: 'Chờ xử lý',
                                1: 'Đang xử lý',
                                2: 'Đã gửi',
                                3: 'Đã giao',
                                4: 'Đã huỷ'
                              };
                              
                              if (!confirm(`Xác nhận thay đổi trạng thái đơn hàng ${o.code || o.id} từ "${statusNames[oldStatus]}" sang "${statusNames[newStatus]}"?`)) {
                                e.target.value = oldStatus;
                                return;
                              }
                              
                              try {
                                await call(`${BASE}${API}/orders/${o.id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: newStatus }),
                                });
                                showToast(`✅ Đã cập nhật trạng thái đơn ${o.code || o.id} sang "${statusNames[newStatus]}"`);
                                await refresh();
                              } catch (err) {
                                alert(err.message || "Cập nhật thất bại");
                                e.target.value = oldStatus;
                              }
                            }}
                            className="ml-2 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium cursor-pointer shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value={0}>Chờ xử lý</option>
                            <option value={1}>Đang xử lý</option>
                            <option value={2}>Đã gửi</option>
                            <option value={3}>Đã giao</option>
                            <option value={4}>Đã huỷ</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()} // tránh kích hoạt onRowClick
                        >
                          <Link
                            href={viewHref(o)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            title="Xem chi tiết"
                            aria-label="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            href={editHref(o)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-indigo-700"
                            title="Sửa"
                            aria-label="Sửa"
                          >
                            <Pencil size={18} />
                          </Link>
                          <button
                            onClick={async () => {
                              if (!confirm("Xoá đơn hàng này?")) return;
                              try {
                                await call(`${BASE}${API}/orders/${o.id}`, { method: "DELETE" });
                                showToast("Đã xoá đơn hàng");
                                await refresh();
                              } catch (e) {
                                alert(e.message || "Xoá thất bại");
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                            title="Xoá"
                            aria-label="Xoá"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Effects */}
      <style jsx>{`
        .animate-fadeIn { animation: fadeIn .25s ease-out both; }
        .animate-slideUp { animation: slideUp .25s ease-out both; }
        .animate-slideDown { animation: slideDown .3s ease-out both; }
        .animate-pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0; transform: translateY(6px)} to{opacity:1; transform: translateY(0)} }
        @keyframes slideDown { from{opacity:0; transform: translate(-50%, -12px)} to{opacity:1; transform: translate(-50%, 0)} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </>
  );
}
