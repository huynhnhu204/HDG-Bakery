"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Plus, Archive } from "lucide-react";

/* ====== Config API (không dùng route.js) ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = BASE + "/api/v1/categories";

/* ====== helpers ====== */
const cx = (...xs) => xs.filter(Boolean).join(" ");
function useDebounce(v, d = 400) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return x;
}
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ====== tiny ui atoms ====== */
const Button = ({ className, variant = "primary", ...p }) => {
  const variantCls = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
  }[variant];
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-medium transition btn-soft",
        variantCls,
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
const Badge = ({ children, ok }) => (
  <span
    className={cx(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium anim-pop",
      ok ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"
    )}
  >
    {children}
  </span>
);
const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={cx(
      "relative inline-flex h-6 w-11 items-center rounded-full transition",
      checked ? "bg-green-600" : "bg-gray-300",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900/10"
    )}
  >
    <span
      className={cx(
        "inline-block h-5 w-5 transform rounded-full bg-white transition shadow",
        checked ? "translate-x-6" : "translate-x-1"
      )}
    />
  </button>
);

/* ====== Page ====== */
export default function CategoriesAdminPage() {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 400);
  const [status, setStatus] = useState(""); // "", "1", "0"
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dq) params.set("q", dq);
      if (status !== "") params.set("status", status);
      params.set("withCounts", "1");
      params.set("per_page", String(perPage));
      params.set("page", String(page));
      const data = await api("?" + params.toString());
      setRows(data.data || []);
      setTotal(data.total ?? 0);
      setLastPage(data.last_page ?? 1);
    } catch (e) {
      alert(`Tải danh mục lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, status, perPage, page]);

  const toggleStatus = async (row, next) => {
    try {
      await api("/" + row.id, { method: "PUT", body: { status: next ? 1 : 0 } });
    } catch (e) {
      alert(`Đổi trạng thái lỗi: ${e.message}`);
      return;
    }
    setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status: next ? 1 : 0 } : x)));
  };

  const removeRow = async (row) => {
    if (!confirm(`Xoá (ẩn) danh mục "${row.name}"?`)) return;
    try {
      await api("/" + row.id, { method: "DELETE" });
      setRows((list) => list.filter((x) => x.id !== row.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(`Xoá thất bại: ${e.message}`);
    }
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  return (
    <>
      {/* Skip to content (a11y/SEO) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white border px-3 py-1.5 rounded shadow"
      >
     
      </a>

      <main id="main-content" className="p-6 anim-fade-in">
        {/* Header */}
        <header className="mb-6 flex items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Danh mục sản phẩm</h1>
            <p className="text-sm text-gray-500">
        
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Nút đi tới Thùng rác (mới thêm) */}
            <Link href="/admin/categories/trash" className="inline-flex" title="Thùng rác">
              <Button variant="secondary">
                <Archive size={16} />
                Thùng rác
              </Button>
            </Link>

            <Link href="/admin/categories/new" className="inline-flex">
              <Button aria-label="Thêm danh mục">
                <Plus size={16} />
                Thêm danh mục
              </Button>
            </Link>
          </div>
        </header>

        {/* Toolbar (có nhãn form cho SEO/a11y) */}
        <section aria-label="Bộ lọc" className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-xs text-gray-600 mb-1">
              Tìm kiếm
            </label>
            <Input
              id="search"
              placeholder="Tìm theo tên/slug…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs text-gray-600 mb-1">
              Trạng thái
            </label>
            <Select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hiển thị</option>
              <option value="0">Đang ẩn</option>
            </Select>
          </div>

          <div>
            <label htmlFor="perPage" className="block text-xs text-gray-600 mb-1">
              Số dòng mỗi trang
            </label>
            <Select
              id="perPage"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Số dòng mỗi trang"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/trang
                </option>
              ))}
            </Select>
          </div>
        </section>

        {/* Table */}
        <section aria-label="Danh sách danh mục">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Tên</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Slug</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Parent</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Sản phẩm</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Trạng thái</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600">Cập nhật</th>
                    <th scope="col" className="px-4 py-3 font-medium text-gray-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 w-40 bg-gray-100 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-28 bg-gray-100 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-28 bg-gray-100 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-10 bg-gray-100 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-6 w-16 bg-gray-100 rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-28 bg-gray-100 rounded" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-9 w-28 bg-gray-100 rounded-xl ml-auto" />
                        </td>
                      </tr>
                    ))}

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                        Chưa có danh mục
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    rows.map((row) => {
                      const statusOk = String(row.status) === "1";
                      return (
                        <tr key={row.id} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-gray-900">{row.name}</div>
                            {row.description ? (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{row.description}</div>
                            ) : null}
                            {/* Link FE (good for SEO preview, mở tab mới) */}
                            {row.slug ? (
                              <a
                                href={`/product?category=${row.slug}`}
                                target="_blank"
                                rel="noopener"
                                className="text-xs text-amber-700 hover:underline"
                              >
                                Xem trên trang bán hàng →
                              </a>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-mono">{row.slug}</td>
                          <td className="px-4 py-3 text-gray-700">{row.parent?.name || row.parent_name || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {row.products_count ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge ok={statusOk}>{statusOk ? "Hiển thị" : "Ẩn"}</Badge>
                              <Switch checked={statusOk} onChange={(v) => toggleStatus(row, v)} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/admin/categories/${row.id}`} className="inline-flex">
                                <span
                                  title="Xem chi tiết"
                                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                                  aria-label={`Xem danh mục ${row.name}`}
                                >
                                  <Eye size={18} />
                                </span>
                              </Link>
                              <Link href={`/admin/categories/${row.id}/edit`} className="inline-flex">
                                <span
                                  title="Sửa"
                                  className="p-2 rounded-lg hover:bg-gray-100 text-indigo-700"
                                  aria-label={`Sửa danh mục ${row.name}`}
                                >
                                  <Pencil size={18} />
                                </span>
                              </Link>
                              <Button
                                variant="secondary"
                                onClick={() => removeRow(row)}
                                title="Xoá"
                                aria-label={`Xoá danh mục ${row.name}`}
                                className="p-2 h-9 w-9 !px-0 !rounded-lg hover:bg-gray-100 text-red-600 border-none bg-transparent"
                              >
                                <Trash2 size={18} />
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
