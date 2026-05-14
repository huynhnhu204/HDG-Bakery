"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { RotateCcw, Trash2, ArrowLeft } from "lucide-react";

/* ================== Config ================== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/* ================== Helpers ================== */
const cx = (...xs) => xs.filter(Boolean).join(" ");

const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";

function useDebounce(v, d = 400) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return x;
}

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
    try { data = JSON.parse(text); }
    catch { data = isJson ? {} : {}; }
  }

  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

function StatusBadge({ status }) {
  const color =
    {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }[(status || "").toString().toLowerCase()] || "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status || "—"}</span>;
}

/* ================== Tiny UI ================== */
const Button = ({ className, variant = "primary", ...p }) => {
  const map = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium transition",
        map[variant],
        p.disabled ? "opacity-50 cursor-not-allowed" : "",
        className
      )}
      {...p}
    />
  );
};
const Input = (p) => (
  <input
    className={cx(
      "h-10 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none",
      "focus:ring-2 focus:ring-gray-900/10 transition hover:border-gray-400",
      p.className
    )}
    {...p}
  />
);
const Select = (p) => (
  <select
    className={cx(
      "h-10 w-full rounded-xl border border-gray-300 px-3 text-sm bg-white outline-none",
      "focus:ring-2 focus:ring-gray-900/10 transition hover:border-gray-400",
      p.className
    )}
    {...p}
  />
);

/* ================== Page ================== */
export default function OrdersTrashPage() {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 400);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState(() => new Set());
  const selectedCount = selected.size;
  const allIdsOnPage = useMemo(() => rows.map(r => r.id), [rows]);
  const allSelectedOnPage = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selected.has(id));

  const clearSelection = () => setSelected(new Set());
  const toggleOne = (id) => {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };
  const toggleAllOnPage = () => {
    setSelected((s) => {
      const ns = new Set(s);
      if (allSelectedOnPage) {
        allIdsOnPage.forEach((id) => ns.delete(id));
      } else {
        allIdsOnPage.forEach((id) => ns.add(id));
      }
      return ns;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      params.set("per_page", String(perPage));
      params.set("page", String(page));

      // BE: GET /api/v1/orders/trash
      const data = await call(`${BASE}${API}/orders/trash?` + params.toString());
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list);
      setTotal(data?.total ?? list.length ?? 0);
      setLastPage(data?.last_page ?? 1);

      // giữ selected nhưng loại những id không còn
      setSelected((s) => new Set([...s].filter(id => list.some(r => r.id === id))));
    } catch (e) {
      alert(`Tải thùng rác lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, perPage, page]);

  // Row actions
  const restoreRow = async (row) => {
    try {
      await call(`${BASE}${API}/orders/${row.id}/restore`, { method: "POST" });
      setRows((list) => list.filter((x) => x.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((s) => { const ns = new Set(s); ns.delete(row.id); return ns; });
    } catch (e) {
      alert(`Khôi phục thất bại: ${e.message}`);
    }
  };

  const purgeRow = async (row) => {
    if (!confirm(`Xoá vĩnh viễn đơn #${row.id}? Hành động này không thể hoàn tác.`)) return;
    try {
      await call(`${BASE}${API}/orders/${row.id}/purge`, { method: "DELETE" });
      setRows((list) => list.filter((x) => x.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((s) => { const ns = new Set(s); ns.delete(row.id); return ns; });
    } catch (e) {
      alert(`Xoá vĩnh viễn lỗi: ${e.message}`);
    }
  };

  // Bulk actions
  const [bulkLoading, setBulkLoading] = useState(false);

  const bulkRestore = async () => {
    if (!selectedCount) return;
    setBulkLoading(true);
    try {
      const ids = [...selected];
      await call(`${BASE}${API}/orders/restore`, {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" }
      });
      setRows((list) => list.filter((x) => !selected.has(x.id)));
      setTotal((t) => Math.max(0, t - ids.length));
      clearSelection();
      setPage((p) => (rows.length - ids.length <= 0 && p > 1 ? p - 1 : p));
    } catch (e) {
      alert(`Khôi phục hàng loạt có lỗi: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkPurge = async () => {
    if (!selectedCount) return;
    if (!confirm(`Xoá vĩnh viễn ${selectedCount} đơn đã chọn? Không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      const ids = [...selected];
      await call(`${BASE}${API}/orders/purge`, {
        method: "DELETE",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" }
      });
      setRows((list) => list.filter((x) => !selected.has(x.id)));
      setTotal((t) => Math.max(0, t - ids.length));
      clearSelection();
      setPage((p) => (rows.length - ids.length <= 0 && p > 1 ? p - 1 : p));
    } catch (e) {
      alert(`Xoá vĩnh viễn hàng loạt có lỗi: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  // JSON-LD Breadcrumb (dù noindex, giúp a11y/structure)
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Admin", "item": `${origin}/admin` },
      { "@type": "ListItem", "position": 2, "name": "Đơn hàng", "item": `${origin}/admin/orders` },
      { "@type": "ListItem", "position": 3, "name": "Thùng rác", "item": `${origin}/admin/orders/trash` }
    ]
  };

  return (
    <>
      <Head>
        <title>Thùng rác — Đơn hàng | Admin</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Khôi phục hoặc xoá vĩnh viễn các đơn hàng đã đưa vào thùng rác." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </Head>

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white border px-3 py-1.5 rounded shadow"
      >
        
      </a>

      <main id="main-content" className="p-6 anim-fade-in" aria-busy={loading ? "true" : "false"}>
        {/* Breadcrumb (a11y) */}
        <nav aria-label="Bạn đang ở đây" className="text-sm text-gray-500 mb-1">
          <ol className="flex items-center gap-1">
            <li><Link href="/admin" className="hover:underline">Admin</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/admin/orders" className="hover:underline">Đơn hàng</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-gray-800 font-medium">Thùng rác</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-6 flex items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">🗑️ Thùng rác — Đơn hàng</h1>
            <p className="text-sm text-gray-500">Các đơn đã xoá mềm (soft delete). Bạn có thể khôi phục hoặc xoá vĩnh viễn.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="inline-flex">
              <Button variant="secondary" aria-label="Quay về trang đơn hàng">
                <ArrowLeft size={16} />
                Quay về đơn hàng
              </Button>
            </Link>
          </div>
        </header>

        {/* Toolbar + Bulk actions */}
        <section aria-label="Bộ lọc" className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-xs text-gray-600 mb-1">
              Tìm kiếm
            </label>
            <Input
              id="search"
              placeholder="Tìm theo tên, email, phone, địa chỉ…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              aria-describedby="search-help"
              aria-label="Tìm kiếm đơn hàng trong thùng rác"
            />
            <p id="search-help" className="sr-only">Nhập từ khoá để lọc đơn.</p>
          </div>

          <div>
            <label htmlFor="perPage" className="block text-xs text-gray-600 mb-1">
              Số dòng mỗi trang
            </label>
            <Select
              id="perPage"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              aria-label="Số dòng mỗi trang"
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/trang</option>)}
            </Select>
          </div>

          {/* Bulk actions */}
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              onClick={bulkRestore}
              disabled={selectedCount === 0 || bulkLoading}
              aria-busy={bulkLoading ? "true" : "false"}
              title="Khôi phục các đơn đã chọn"
            >
              <RotateCcw size={16} />
              Khôi phục ({selectedCount || 0})
            </Button>
            <Button
              variant="danger"
              onClick={bulkPurge}
              disabled={selectedCount === 0 || bulkLoading}
              aria-busy={bulkLoading ? "true" : "false"}
              title="Xoá vĩnh viễn các đơn đã chọn"
            >
              <Trash2 size={16} />
              Xoá vĩnh viễn ({selectedCount || 0})
            </Button>
          </div>
        </section>

        {/* Table */}
        <section aria-label="Danh sách thùng rác">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <caption className="sr-only">Danh sách các đơn hàng đang trong thùng rác</caption>
                <thead className="bg-gray-50 text-left sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10" scope="col">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả trên trang"
                        checked={allSelectedOnPage}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Mã</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Khách hàng</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Tổng tiền</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Trạng thái</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Ngày đặt</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y" aria-live="polite">
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-36 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-3"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                        <td className="px-4 py-3 text-right"><div className="h-9 w-40 bg-gray-100 rounded-xl ml-auto" /></td>
                      </tr>
                    ))}

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        Thùng rác trống
                      </td>
                    </tr>
                  )}

                  {!loading && rows.map((o) => {
                    const isChecked = selected.has(o.id);
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Chọn đơn #${o.id}`}
                            checked={isChecked}
                            onChange={() => toggleOne(o.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono">{o.code || o.order_code || o.id}</td>
                        <td className="px-4 py-3">{o.name || o.user?.name || "—"}</td>
                        <td className="px-4 py-3">{vnd(o.total || 0)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status_text || o.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => restoreRow(o)}
                              aria-label={`Khôi phục đơn #${o.id}`}
                              title="Khôi phục"
                            >
                              <RotateCcw size={16} />
                              Khôi phục
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => purgeRow(o)}
                              aria-label={`Xoá vĩnh viễn đơn #${o.id}`}
                              title="Xoá vĩnh viễn"
                            >
                              <Trash2 size={16} />
                              Xoá vĩnh viễn
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t text-sm">
              <div className="text-gray-600">
                {total > 0 ? (
                  <>
                    Hiển thị <span className="font-medium text-gray-900">{start}</span>–
                    <span className="font-medium text-gray-900">{end}</span> trong tổng{" "}
                    <span className="font-medium text-gray-900">{total}</span> mục
                  </>
                ) : (
                  <>Tổng <span className="font-medium text-gray-900">0</span> mục</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>
                <span className="px-2">
                  Trang <span className="font-medium">{page}</span>/<span>{lastPage}</span>
                </span>
                <button
                  type="button"
                  className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
