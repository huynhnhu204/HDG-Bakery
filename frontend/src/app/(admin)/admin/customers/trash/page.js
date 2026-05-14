"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

function cx(...xs){ return xs.filter(Boolean).join(" "); }

async function jfetch(url, { method = "GET", body } = {}) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data ?? {};
}

export default function CustomersTrashPage() {
  // filters + paging
  const [q, setQ] = useState("");
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);

  // data state
  const [rows, setRows]   = useState([]);
  const [total, setTotal] = useState(0);
  const [last, setLast]   = useState(1);
  const [loading, setLoading] = useState(false);

  // bulk selection
  const [selected, setSelected] = useState(() => new Set());
  const idsOnPage = useMemo(() => rows.map(r => r.id), [rows]);
  const allChecked = idsOnPage.length > 0 && idsOnPage.every(id => selected.has(id));
  const toggleOne = (id) => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  const toggleAllOnPage = () => setSelected(s => {
    const ns = new Set(s);
    if (allChecked) idsOnPage.forEach(id => ns.delete(id));
    else idsOnPage.forEach(id => ns.add(id));
    return ns;
  });
  const clearSel = () => setSelected(new Set());

  // load trash
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("per_page", String(perPage));
      params.set("page", String(page));
      const data = await jfetch(`${BASE}${API}/customers/trash?` + params.toString());
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRows(list);
      setTotal(data?.total ?? list.length ?? 0);
      setLast(data?.last_page ?? 1);

      // giữ selection hợp lệ trong trang hiện tại
      setSelected(s => new Set([...s].filter(id => list.some(x => x.id === id))));
    } catch (e) {
      alert("Tải thùng rác lỗi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, perPage, page]);

  // actions
  const restoreOne = async (row) => {
    try {
      await jfetch(`${BASE}${API}/customers/${row.id}/restore`, { method: "POST" });
      setRows(list => list.filter(x => x.id !== row.id));
      setTotal(t => Math.max(0, t - 1));
      setSelected(s => { const ns = new Set(s); ns.delete(row.id); return ns; });
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
    } catch (e) {
      alert("Khôi phục thất bại: " + e.message);
    }
  };

  const purgeOne = async (row) => {
    if (!confirm(`Xoá vĩnh viễn "${row.name}"? Hành động không thể hoàn tác.`)) return;
    try {
      await jfetch(`${BASE}${API}/customers/${row.id}/purge`, { method: "DELETE" });
      setRows(list => list.filter(x => x.id !== row.id));
      setTotal(t => Math.max(0, t - 1));
      setSelected(s => { const ns = new Set(s); ns.delete(row.id); return ns; });
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
    } catch (e) {
      alert("Xoá vĩnh viễn thất bại: " + e.message);
    }
  };

  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkRestore = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await jfetch(`${BASE}${API}/customers/restore`, { method: "POST", body: { ids: [...selected] } });
      setRows(list => list.filter(x => !selected.has(x.id)));
      setTotal(t => Math.max(0, t - selected.size));
      clearSel();
      if (rows.length - selected.size <= 0 && page > 1) setPage(p => p - 1);
    } catch (e) {
      alert("Khôi phục hàng loạt lỗi: " + e.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkPurge = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Xoá vĩnh viễn ${selected.size} khách hàng đã chọn?`)) return;
    setBulkBusy(true);
    try {
      await jfetch(`${BASE}${API}/customers/purge`, { method: "DELETE", body: { ids: [...selected] } });
      setRows(list => list.filter(x => !selected.has(x.id)));
      setTotal(t => Math.max(0, t - selected.size));
      clearSel();
      if (rows.length - selected.size <= 0 && page > 1) setPage(p => p - 1);
    } catch (e) {
      alert("Xoá vĩnh viễn hàng loạt lỗi: " + e.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(total, page * perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🗑️ Thùng rác — Khách hàng</h1>
          <p className="text-sm text-gray-500"></p>
        </div>
        <Link href="/admin/customers" className="inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium border hover:bg-gray-50">
          <ArrowLeft size={16} /> Quay về danh sách
        </Link>
      </div>

      {/* Filters + bulk */}
      <section className="bg-white rounded-xl border p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Tìm theo tên/Email/SĐT…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <select
            className="border rounded-xl px-3 py-2"
            value={perPage}
            onChange={(e)=>{ setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}/trang</option>)}
          </select>
          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={bulkRestore}
              disabled={selected.size === 0 || bulkBusy}
              className={cx("px-3.5 h-10 rounded-xl text-sm font-medium border bg-white hover:bg-gray-50",
                selected.size === 0 || bulkBusy ? "opacity-60 cursor-not-allowed" : "")}
            >
              <span className="inline-flex items-center gap-2"><RotateCcw size={16}/> Khôi phục ({selected.size})</span>
            </button>
            <button
              onClick={bulkPurge}
              disabled={selected.size === 0 || bulkBusy}
              className={cx("px-3.5 h-10 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700",
                selected.size === 0 || bulkBusy ? "opacity-60 cursor-not-allowed" : "")}
            >
              <span className="inline-flex items-center gap-2"><Trash2 size={16}/> Xoá vĩnh viễn ({selected.size})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-x-auto shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả trên trang"
                  checked={allChecked}
                  onChange={toggleAllOnPage}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Tên</th>
              <th className="px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600">SĐT</th>
              <th className="px-4 py-3 font-medium text-gray-600">Nhóm</th>
              <th className="px-4 py-3 font-medium text-gray-600">Xoá lúc</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Đang tải…</td></tr>
            )}

            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Thùng rác trống</td></tr>
            )}

            {!loading && rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.name}</div>
                  {row.address ? <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{row.address}</div> : null}
                </td>
                <td className="px-4 py-3 text-gray-700">{row.email || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{row.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{row.group || "—"}</td>
                <td className="px-4 py-3 text-gray-700">
                  {row.deleted_at ? new Date(row.deleted_at).toLocaleString("vi-VN") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => restoreOne(row)}
                      className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 inline-flex items-center gap-2"
                      title="Khôi phục"
                    >
                      <RotateCcw size={16}/> Khôi phục
                    </button>
                    <button
                      onClick={() => purgeOne(row)}
                      className="px-3 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
                      title="Xoá vĩnh viễn"
                    >
                      <Trash2 size={16}/> Xoá vĩnh viễn
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t text-sm">
          <div className="text-gray-600">
            {total > 0
              ? <>Hiển thị <b>{start}</b>–<b>{Math.min(total, page * perPage)}</b> trong tổng <b>{total}</b> mục</>
              : <>Tổng <b>0</b> mục</>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Trước
            </button>
            <span className="px-2">
              Trang <span className="font-medium">{page}</span>/<span>{last}</span>
            </span>
            <button
              type="button"
              className="px-3 h-9 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
              disabled={page >= last}
              onClick={() => setPage(p => Math.min(last, p + 1))}
            >
              Sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
