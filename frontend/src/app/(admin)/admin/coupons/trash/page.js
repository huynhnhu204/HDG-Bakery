"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2, ArrowLeft } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = BASE + "/api/v1/coupons";
const KEY  = "admin_token";

const cx = (...xs) => xs.filter(Boolean).join(" ");
function useDebounce(v, d = 400) {
  const [x, setX] = useState(v);
  useEffect(() => { const t = setTimeout(() => setX(v), d); return () => clearTimeout(t); }, [v, d]);
  return x;
}

async function jfetch(url, { method = "GET", body } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

const Button = ({ className, variant = "primary", ...p }) => {
  const variantCls = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium transition btn-soft",
        variantCls,
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

export default function CouponsTrashPage() {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 350);
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(() => new Set());
  const selectedCount = selected.size;
  const allIdsOnPage = useMemo(() => rows.map(r => r.id), [rows]);
  const allSelectedOnPage = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selected.has(id));
  const toggleOne = (id) => setSelected((s) => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  const toggleAllOnPage = () => setSelected((s) => {
    const ns = new Set(s);
    if (allSelectedOnPage) allIdsOnPage.forEach(id => ns.delete(id));
    else allIdsOnPage.forEach(id => ns.add(id));
    return ns;
  });
  const clearSelection = () => setSelected(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      params.set("per_page", String(perPage));
      params.set("page", String(page));

      const data = await jfetch(`${API}/trash?${params.toString()}`);
      const list = data?.data || [];
      setRows(list);
      setTotal(data?.total ?? 0);
      setLastPage(data?.last_page ?? 1);
      setSelected((s) => new Set([...s].filter(id => list.some(r => r.id === id))));
    } catch (e) {
      alert(`Tải thùng rác lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dq, perPage, page]);

  const restoreRow = async (row) => {
    try {
      await jfetch(`${API}/${row.id}/restore`, { method: "POST" });
      setRows((list) => list.filter((x) => x.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((s) => { const ns = new Set(s); ns.delete(row.id); return ns; });
    } catch (e) {
      alert(`Khôi phục thất bại: ${e.message}`);
    }
  };

  const purgeRow = async (row) => {
    if (!confirm(`Xoá vĩnh viễn mã giảm giá "${row.code}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await jfetch(`${API}/${row.id}/purge`, { method: "DELETE" });
      setRows((list) => list.filter((x) => x.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((s) => { const ns = new Set(s); ns.delete(row.id); return ns; });
    } catch (e) {
      alert(`Xoá vĩnh viễn lỗi: ${e.message}`);
    }
  };

  const [bulkLoading, setBulkLoading] = useState(false);

  const bulkRestore = async () => {
    if (selectedCount === 0) return;
    setBulkLoading(true);
    try {
      await jfetch(`${API}/restore`, {
        method: "POST",
        body: { ids: [...selected] },
      });
      setRows((list) => list.filter((x) => !selected.has(x.id)));
      setTotal((t) => Math.max(0, t - selectedCount));
      clearSelection();
      setPage((p) => (rows.length - selectedCount <= 0 && p > 1 ? p - 1 : p));
    } catch (e) {
      alert(`Khôi phục hàng loạt lỗi: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkPurge = async () => {
    if (selectedCount === 0) return;
    if (!confirm(`Xoá vĩnh viễn ${selectedCount} mã giảm giá đã chọn? Hành động không thể hoàn tác.`)) return;
    setBulkLoading(true);
    try {
      await jfetch(`${API}/purge`, {
        method: "DELETE",
        body: { ids: [...selected] },
      });
      setRows((list) => list.filter((x) => !selected.has(x.id)));
      setTotal((t) => Math.max(0, t - selectedCount));
      clearSelection();
      setPage((p) => (rows.length - selectedCount <= 0 && p > 1 ? p - 1 : p));
    } catch (e) {
      alert(`Xoá vĩnh viễn hàng loạt lỗi: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  return (
    <>
      <Head>
        <title>Thùng rác — Mã giảm giá | Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main id="main-content" className="p-6 anim-fade-in" aria-busy={loading ? "true" : "false"}>
        <nav aria-label="Bạn đang ở đây" className="text-sm text-gray-500 mb-1">
          <ol className="flex items-center gap-1">
            <li><Link href="/admin" className="hover:underline">Admin</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/admin/coupons" className="hover:underline">Mã giảm giá</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-gray-800 font-medium">Thùng rác</li>
          </ol>
        </nav>

        <header className="mb-6 flex items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">🗑️ Thùng rác — Mã giảm giá</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/coupons" className="inline-flex">
              <Button variant="secondary" aria-label="Quay về danh sách mã giảm giá">
                <ArrowLeft size={16} />
                Quay về mã giảm giá
              </Button>
            </Link>
          </div>
        </header>

        <section aria-label="Bộ lọc" className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-xs text-gray-600 mb-1">Tìm kiếm</label>
            <Input
              id="search"
              placeholder="Tìm theo tên/mã…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label htmlFor="perPage" className="block text-xs text-gray-600 mb-1">Số dòng mỗi trang</label>
            <Select
              id="perPage"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={bulkRestore} disabled={selectedCount === 0 || bulkLoading} aria-busy={bulkLoading ? "true" : "false"}>
              <RotateCcw size={16} />
              Khôi phục ({selectedCount || 0})
            </Button>
            <Button variant="danger" onClick={bulkPurge} disabled={selectedCount === 0 || bulkLoading} aria-busy={bulkLoading ? "true" : "false"}>
              <Trash2 size={16} />
              Xoá vĩnh viễn ({selectedCount || 0})
            </Button>
          </div>
        </section>

        <section aria-label="Danh sách thùng rác">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả trên trang"
                        checked={allSelectedOnPage}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">Tên</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Mã</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Giảm giá</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Ngày bắt đầu</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Ngày kết thúc</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Cập nhật</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y" aria-live="polite">
                  {loading && (
                    <tr className="animate-pulse">
                      <td className="px-4 py-3" colSpan={8}><div className="h-4 w-full bg-gray-100 rounded" /></td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Thùng rác trống</td></tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900">{row.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{row.code}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.discount_type === 'percent' ? `${row.discount_value}%` : `${row.discount_value?.toLocaleString("vi-VN")}₫`}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.start_date ? new Date(row.start_date).toLocaleDateString("vi-VN") : "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.end_date ? new Date(row.end_date).toLocaleDateString("vi-VN") : "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" onClick={() => restoreRow(row)} title="Khôi phục">
                            <RotateCcw size={16} /> Khôi phục
                          </Button>
                          <Button variant="danger" onClick={() => purgeRow(row)} title="Xoá vĩnh viễn">
                            <Trash2 size={16} /> Xoá vĩnh viễn
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t text-sm">
              <div className="text-gray-600">
                {total > 0 ? (
                  <>Hiển thị <span className="font-medium text-gray-900">{start}</span>–<span className="font-medium text-gray-900">{end}</span> trong tổng <span className="font-medium text-gray-900">{total}</span> mục</>
                ) : <>Tổng <span className="font-medium text-gray-900">0</span> mục</>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >← Trước</button>
                <span className="px-2">Trang <span className="font-medium">{page}</span>/<span>{lastPage}</span></span>
                <button
                  type="button"
                  className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >Sau →</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}








