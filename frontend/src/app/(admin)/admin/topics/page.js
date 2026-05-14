"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

const cx = (...xs) => xs.filter(Boolean).join(" ");

async function getJSON(url) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `${r.status} ${r.statusText}`);
  return d;
}

export default function AdminTopicsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "", "1", "0"
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Quick add
  const [quickName, setQuickName] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const u = new URL(`${BASE}${API}/topics`);
      if (q) u.searchParams.set("q", q);
      if (status !== "") u.searchParams.set("status", status);
      u.searchParams.set("per_page", String(perPage));
      u.searchParams.set("page", String(page));

      const data = await getJSON(u.toString());
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
      setLastPage(Number(data?.last_page || 1));
    } catch (e) {
      alert(e.message || "Tải danh sách thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, status, page, perPage]);

  const removeRow = async (row) => {
    if (!confirm(`Xoá topic "${row.name}"?`)) return;
    try {
      const t = localStorage.getItem(KEY);
      const r = await fetch(`${BASE}${API}/topics/${row.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      });
      if (!r.ok) throw new Error("Xoá thất bại");
      setRows((xs) => xs.filter((x) => x.id !== row.id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (e) {
      alert(e.message || "Lỗi xoá");
    }
  };

  const quickCreate = async () => {
    const name = quickName.trim();
    if (!name) return;
    setQuickSaving(true);
    try {
      const t = localStorage.getItem(KEY);
      const r = await fetch(`${BASE}${API}/topics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify({ name, status: 1 }),
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(msg || "Tạo topic thất bại");
      }
      setQuickName("");
      await load();
    } catch (e) {
      alert(e.message || "Tạo nhanh thất bại");
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Topics</h1>
          <p className="text-sm text-gray-500">Danh mục bài viết (news) dùng cho SEO & phân nhóm nội dung.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/topics/trash"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Trash2 size={18} /> Thùng rác
          </Link>
          <Link
            href="/admin/topics/new"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
          >
            <Plus size={18} /> Thêm topic
          </Link>
        </div>
      </div>

      {/* Toolbar + Quick add */}
      <div className="grid gap-3 md:grid-cols-4 bg-white p-4 rounded-xl border">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Tìm theo tên/slug…"
          className="h-10 rounded-lg border px-3 text-sm"
          aria-label="Tìm kiếm topic"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border px-3 text-sm bg-white"
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="1">Hiển thị</option>
          <option value="0">Ẩn</option>
        </select>
        <select
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          className="h-10 rounded-lg border px-3 text-sm bg-white"
          aria-label="Số dòng mỗi trang"
        >
          {[10,20,50,100].map((n) => <option key={n} value={n}>{n}/trang</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="h-10 rounded-lg bg-black px-3 text-sm text-white hover:opacity-90"
          >
            Làm mới
          </button>
        </div>

        {/* Quick add row (span 4 cols) */}
        <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t">
          <input
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="Thêm nhanh: nhập tên topic & Enter"
            onKeyDown={(e) => (e.key === "Enter" ? (e.preventDefault(), quickCreate()) : null)}
            className="h-10 rounded-lg border px-3 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={quickCreate}
              disabled={quickSaving || !quickName.trim()}
              className="h-10 rounded-lg bg-black px-3 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {quickSaving ? "Đang tạo…" : "Thêm nhanh"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Tên</th>
                <th className="px-4 py-2 font-medium text-gray-600">Slug</th>
                <th className="px-4 py-2 font-medium text-gray-600">Bài viết</th>
                <th className="px-4 py-2 font-medium text-gray-600">Trạng thái</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">Đang tải…</td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">Chưa có topic.</td>
                </tr>
              )}

              {!loading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.description ? (
                      <div className="text-xs text-gray-500 line-clamp-1">{row.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{row.slug}</td>
                  <td className="px-4 py-2">{row.posts_count ?? 0}</td>
                  <td className="px-4 py-2">
                    <span className={cx(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      String(row.status)==="1" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                    )}>
                      {String(row.status)==="1" ? "Hiển thị" : "Ẩn"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/topics/${row.id}`} title="Xem">
                        <button className="p-2 rounded-lg bg-black text-white hover:opacity-90"><Eye size={18} /></button>
                      </Link>
                      <Link href={`/admin/topics/${row.id}/edit`} title="Sửa">
                        <button className="p-2 rounded-lg bg-black text-white hover:opacity-90"><Pencil size={18} /></button>
                      </Link>
                      <button
                        onClick={() => removeRow(row)}
                        title="Xoá"
                        className="p-2 rounded-lg bg-black text-white hover:opacity-90"
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <div className="text-gray-600">
            Tổng <span className="font-medium text-gray-900">{total}</span> mục
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg bg-black px-3 py-1.5 text-white disabled:opacity-40 hover:opacity-90"
              aria-label="Trang trước"
            >
              ← Trước
            </button>
            <span>Trang <b>{page}</b> / {lastPage}</span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="rounded-lg bg-black px-3 py-1.5 text-white disabled:opacity-40 hover:opacity-90"
              aria-label="Trang sau"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
