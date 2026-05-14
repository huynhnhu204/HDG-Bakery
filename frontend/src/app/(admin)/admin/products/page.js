"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** ====== API constants ====== */
const BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
).replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

/** ====== helpers ====== */
function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
const fmtPrice = (n) =>
  (Number(n) || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
const cls = (...xs) => xs.filter(Boolean).join(" ");

/** ====== Icons ====== */
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
  </svg>
);
const IconTrash = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M9 3h6l1 1h4v2H4V4h4l1-1Zm-3 6h12l-1 11H7L6 9Z"
    />
  </svg>
);
const IconEye = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 .001-10.001A5 5 0 0 1 12 17Z"
    />
  </svg>
);
const IconEdit = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.46a1 1 0 0 0 0-1.41l-2.09-2.09a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.58-1.58Z"
    />
  </svg>
);
const IconDownload = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M12 3v10l4-4 1.4 1.4L12 17.8 6.6 10.4 8 9l4 4V3h0Zm-7 16h14v2H5v-2Z"
    />
  </svg>
);
const IconUpload = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M5 18h14v2H5v-2Zm7-15 6.4 6.4-1.4 1.4-4-4V17h-2V6.8l-4 4L5.6 9.4 12 3Z"
    />
  </svg>
);
const IconContact = (p) => (
  <svg viewBox="0 0 24 24" className={p.className || "w-4 h-4"}>
    <path
      fill="currentColor"
      d="M20 2H6a2 2 0 0 0-2 2v2H2v2h2v8H2v2h2v2a2 2 0 0 0 2 2h14v-2H6v-2h14v-2H6V8h14V6H6V4h14V2Zm-7 4a3 3 0 1 1 0 6a3 3 0 0 1 0-6Zm0 7c3.33 0 6 1.34 6 3v1h-6v-1c0-.71-.26-1.37-.73-1.9c-.86-.94-2.22-1.1-3.27-.47A2.98 2.98 0 0 0 7 16v1H6v-1c0-1.66 2.67-3 6-3Z"
    />
  </svg>
);

/** Meta (đơn giản) */
const PageHead = () => (
  <>
    <title>Quản lý sản phẩm - Tiệm bánh</title>
    <meta name="robots" content="noindex, nofollow" />
  </>
);

/** Tiny UI – giống trang "new", accent cam */
const Label = ({ children }) => (
  <label className="block text-sm font-medium mb-1">{children}</label>
);
const TextInput = (props) => (
  <input
    {...props}
    className={cls(
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
    )}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={cls(
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
    )}
  />
);

/** ====== Page ====== */
export default function ProductsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // query state
  const [q, setQ] = useState(sp.get("q") || "");
  const [page, setPage] = useState(parseInt(sp.get("page") || "1", 10));
  const [limit, setLimit] = useState(parseInt(sp.get("limit") || "10", 10));
  const [categoryId, setCategoryId] = useState(sp.get("category_id") || "");
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [sort, setSort] = useState(sp.get("sort") || "created_at:desc");

  // data
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // selection
  const [selected, setSelected] = useState([]);
  const allChecked = rows.length > 0 && selected.length === rows.length;

  const importRef = useRef(null);
  const debounceRef = useRef(null);

  // load categories
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${BASE}${API}/categories`, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        setCategories(
          Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
        );
      })
      .catch(() => setCategories([]));
    return () => ac.abort();
  }, []);

  // sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page !== 1) params.set("page", String(page));
    if (limit !== 10) params.set("limit", String(limit));
    if (categoryId) params.set("category_id", categoryId);
    if (status !== "") params.set("status", status);
    if (sort !== "created_at:desc") params.set("sort", sort);
    const url = `/admin/products${
      params.toString() ? "?" + params.toString() : ""
    }`;
    window.history.replaceState(null, "", url);
  }, [q, page, limit, categoryId, status, sort]);

  // fetch list
  const fetchList = async () => {
    setBusy(true);
    setErr(null);
    setSelected([]);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (categoryId) params.set("category_id", categoryId);
      if (status !== "") params.set("status", status);
      if (sort) params.set("sort", sort);

      const token = getToken();
      const r = await fetch(`${BASE}${API}/products?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const meta = json?.meta || {};
      setRows(list);
      setTotal(meta?.total ?? meta?.pagination?.total ?? list.length);
    } catch (e) {
      setErr(e.message || "Lỗi tải danh sách");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchList, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q, page, limit, categoryId, status, sort]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // actions
  const toggleSelectAll = () =>
    setSelected(allChecked ? [] : rows.map((x) => x.id));
  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const onDelete = async (ids) => {
    if (!ids.length) return;
    if (!confirm(`Xoá ${ids.length} sản phẩm?`)) return;
    const token = getToken();
    try {
      setBusy(true);
      const bulk = await fetch(`${BASE}${API}/products/bulk-delete`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids }),
      }).catch(() => null);
      if (!bulk || !bulk.ok) {
        for (const id of ids) {
          await fetch(`${BASE}${API}/products/${id}`, {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        }
      }
      await fetchList();
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    } finally {
      setBusy(false);
    }
  };

  const onSetStatus = async (ids, newStatus) => {
    if (!ids.length) return;
    const token = getToken();
    try {
      setBusy(true);
      const bulk = await fetch(`${BASE}${API}/products/bulk-update`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids, data: { status: newStatus } }),
      }).catch(() => null);

      if (!bulk || !bulk.ok) {
        for (const id of ids) {
          await fetch(`${BASE}${API}/products/${id}`, {
            method: "PATCH",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status: newStatus }),
          });
        }
      }
      await fetchList();
    } catch (e) {
      alert(e.message || "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "id",
      "name",
      "sku",
      "price_buy",
      "category_id",
      "quantity",
      "status",
    ];
    const lines = [headers.join(",")].concat(
      rows.map((r) =>
        [
          r.id ?? "",
          csvCell(r.name),
          csvCell(r.sku),
          r.price_buy ?? "",
          r.category_id ?? r.category?.id ?? "",
          r.quantity ?? "",
          r.status ?? "",
        ].join(",")
      )
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const csvCell = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  const importCSV = async (file) => {
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...rowsText] = text.split(/\r?\n/).filter(Boolean);
    const heads = headerLine.split(",").map((h) => h.trim().toLowerCase());
    const req = ["name", "sku", "price_buy", "category_id", "quantity", "status"];
    if (!req.every((f) => heads.includes(f)))
      return alert(`CSV cần: ${req.join(", ")}`);
    if (!confirm(`Nhập ${rowsText.length} dòng từ CSV?`)) return;

    const token = getToken();
    setBusy(true);
    try {
      for (const line of rowsText) {
        const cols = parseCsvLine(line);
        const obj = Object.fromEntries(heads.map((h, i) => [h, cols[i]]));
        const fd = new FormData();
        fd.append("name", obj.name);
        fd.append("sku", obj.sku);
        fd.append("price_buy", String(Number(obj.price_buy) || 0));
        fd.append("category_id", obj.category_id);
        fd.append("quantity", String(Number(obj.quantity) || 0));
        fd.append("status", String(Number(obj.status) || 0));
        await fetch(`${BASE}${API}/products`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: fd,
        });
      }
      await fetchList();
      alert("Import hoàn tất (xem console nếu có lỗi từng dòng).");
    } catch (e) {
      alert("Import lỗi: " + e.message);
    } finally {
      setBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const parseCsvLine = (line) => {
    const out = [];
    let cur = "",
      inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  return (
    <>
      <PageHead />
      <div className="min-h-screen w-full bg-orange-50 py-10">
        <div className="mx-auto max-w-7xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          {/* Header + Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Quản lý sản phẩm
              </h1>
              <p className="text-sm text-gray-500">
                Danh sách sản phẩm bánh ngọt - Tiệm bánh
              </p>
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <span>{total} sản phẩm</span>
                <span className="text-gray-300">•</span>
                <span>
                  {rows.filter((r) => r.status === 1).length} đang đăng
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/admin/products/trash")}
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-1">
                  <IconTrash /> Thùng rác
                </span>
              </button>
              <button
                onClick={exportCSV}
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-1">
                  <IconDownload /> Export
                </span>
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => importCSV(e.target.files?.[0])}
              />
              <button
                onClick={() => importRef.current?.click()}
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-1">
                  <IconUpload /> Import
                </span>
              </button>
              <a
                href="mailto:hello@tiembanh.local"
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-1">
                  <IconContact /> Liên hệ
                </span>
              </a>
              <button
                onClick={() => router.push("/admin/products/new")}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
              >
                <span className="inline-flex items-center gap-1">
                  <IconPlus /> Thêm sản phẩm
                </span>
              </button>
            </div>
          </div>

          {/* Bộ lọc */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label>Tìm kiếm</Label>
              <div className="flex gap-2">
                <TextInput
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Tên sản phẩm, SKU…"
                />
                <button
                  className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  type="button"
                >
                  Xoá
                </button>
              </div>
            </div>
            <div>
              <Label>Danh mục</Label>
              <Select
                value={categoryId}
                onChange={(e) => {
                  setPage(1);
                  setCategoryId(e.target.value);
                }}
              >
                <option value="">Tất cả</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">Tất cả</option>
                <option value="1">Đang đăng</option>
                <option value="0">Bản nháp</option>
              </Select>
            </div>
            <div>
              <Label>Số lượng</Label>
              <Select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(parseInt(e.target.value, 10));
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/trang
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Bulk + sort */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border rounded-md p-3 bg-gray-50">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleSelectAll}
                />
                Chọn tất cả ({selected.length})
              </label>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onSetStatus(selected, 1)}
                className="text-sm px-2 py-1 border rounded hover:bg-white disabled:opacity-50"
                disabled={!selected.length || busy}
              >
                Đăng
              </button>
              <button
                onClick={() => onSetStatus(selected, 0)}
                className="text-sm px-2 py-1 border rounded hover:bg-white disabled:opacity-50"
                disabled={!selected.length || busy}
              >
                Bản nháp
              </button>
              <button
                onClick={() => onDelete(selected)}
                className="text-sm px-2 py-1 border rounded hover:bg-white disabled:opacity-50"
                disabled={!selected.length || busy}
              >
                Xoá
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="created_at:desc">Mới nhất</option>
                <option value="created_at:asc">Cũ nhất</option>
                <option value="price_buy:asc">Giá thấp</option>
                <option value="price_buy:desc">Giá cao</option>
              </Select>
            </div>
          </div>

          {/* Bảng */}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b bg-gray-50">
                  <th className="py-3 pl-3 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-2">Ảnh</th>
                  <th className="py-3 px-2">Tên</th>
                  <th className="py-3 px-2">Danh mục</th>
                  <th className="py-3 px-2 text-right">Giá</th>
                  <th className="py-3 px-2 text-center">Tồn</th>
                  <th className="py-3 px-2 text-center">Kênh</th>
                  <th className="py-3 px-2 text-center">Trạng thái</th>
                  <th className="py-3 px-2 text-center">Tạo lúc</th>
                  <th className="py-3 px-2 text-right pr-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.length === 0 && !busy && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-gray-500"
                    >
                      Không có sản phẩm.
                    </td>
                  </tr>
                )}

                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-orange-50/40">
                    <td className="py-3 pl-3 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="h-12 w-12 rounded-md overflow-hidden border bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            row.thumbnail_url ||
                            row.image_url ||
                            "/placeholder.png"
                          }
                          alt={row.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-800">
                        {row.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        SKU: {row.sku || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">
                      {row.category?.name || row.category_name || "—"}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700">
                      {fmtPrice(row.price_buy)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={cls(
                        "font-medium",
                        (row.available_quantity ?? 0) > 0 
                          ? "text-green-600" 
                          : "text-red-600"
                      )}>
                        {row.available_quantity ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {(row.channels || []).map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={cls(
                          "px-2 py-0.5 text-xs rounded-full border",
                          row.status === 1
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200"
                        )}
                      >
                        {row.status === 1 ? "Đang đăng" : "Bản nháp"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-500">
                      {(row.created_at || row.createdAt || "")
                        .slice(0, 19)
                        .replace("T", " ")}
                    </td>
                    <td className="py-3 px-2 text-right pr-3">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          className="p-2 text-gray-600 border rounded hover:bg-gray-50"
                          onClick={() =>
                            router.push(`/admin/products/${row.id}?mode=view`)
                          }
                          title="Xem"
                          aria-label="Xem"
                          type="button"
                        >
                          <IconEye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-600 border rounded hover:bg-gray-50"
                          onClick={() =>
                            router.push(`/admin/products/${row.id}`)
                          }
                          title="Sửa"
                          aria-label="Sửa"
                          type="button"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-600 border rounded hover:bg-gray-50"
                          onClick={() => onDelete([row.id])}
                          title="Xóa"
                          aria-label="Xóa"
                          type="button"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {busy && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-gray-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Đang tải dữ liệu…
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Hiển thị {(page - 1) * limit + 1}–
                {Math.min(page * limit, total)} / {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm">
                  Trang {page}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages || busy}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}

          {err && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {err}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
