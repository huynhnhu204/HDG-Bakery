"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Upload,
  Download,
  Mail,
  RefreshCw,
  Filter,
} from "lucide-react";

/**
 * Admin Contacts Page (Next.js App Router)
 * File suggestion: src/app/(admin)/admin/contacts/page.js
 *
 * Requirements handled:
 * - List contacts with filters, pagination, basic actions (view/edit/delete)
 * - Uses Bearer token from localStorage (key: "admin_token")
 * - Defensive against both array and Laravel paginator shape { data: [], meta: {...} }
 * - CSV export; Import button stub (wire up to your BE endpoint when ready)
 * - Tailwind-based UI; zero external UI deps beyond lucide-react
 */

/* ================== Config ================== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1"; // -> your Laravel prefix
const KEY = "admin_token"; // localStorage key for admin bearer token

/* ================== Helpers ================== */
async function apiFetch(path, { method = "GET", body, token, headers = {}, signal } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });
  const text = await r.text();
  const data = text ? safeJson(text) : {};
  if (!r.ok) throw new Error(data?.message || `${r.status} ${r.statusText}`);
  return data;
}

function safeJson(t) {
  try {
    return JSON.parse(t);
  } catch (_) {
    return {};
  }
}

function toCSV(rows, columns) {
  const header = columns.map((c) => c.label || c.key).join(",");
  const lines = rows
    .map((row) =>
      columns
        .map((c) => {
          const v = c.renderRaw ? c.renderRaw(row) : row?.[c.key];
          let s = v == null ? "" : String(v);
          s = s.replace(/"/g, '""');
          if (/[",\n]/.test(s)) s = `"${s}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
  return header + "\n" + lines;
}

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clsx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ================== Small UI Bits ================== */
function Badge({ children, color = "gray" }) {
  const colorMap = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 text-xs border rounded", colorMap[color])}>
      {children}
    </span>
  );
}

function StatusBadge({ value }) {
  const v = (value || "").toString().toLowerCase();
  if (["new", "mới", "open"].includes(v)) return <Badge color="blue">Mới</Badge>;
  if (["in_progress", "processing", "đang xử lý", "progress"].includes(v))
    return <Badge color="yellow">Đang xử lý</Badge>;
  if (["done", "resolved", "hoàn tất", "closed"].includes(v)) return <Badge color="green">Hoàn tất</Badge>;
  if (["cancel", "canceled", "đã hủy", "rejected"].includes(v)) return <Badge color="red">Đã hủy</Badge>;
  return <Badge>{value ?? "—"}</Badge>;
}

function PriorityBadge({ value }) {
  const v = (value || "").toString().toLowerCase();
  if (["high", "cao"].includes(v)) return <Badge color="red">Cao</Badge>;
  if (["medium", "trung bình", "normal"].includes(v)) return <Badge color="yellow">Trung bình</Badge>;
  if (["low", "thấp"].includes(v)) return <Badge color="green">Thấp</Badge>;
  return <Badge>{value ?? "—"}</Badge>;
}

function formatDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString("vi-VN");
}

/* ================== Main Page ================== */
export default function AdminContactsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [meta, setMeta] = useState({ page: 1, per_page: 20, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({
    q: "",
    channel: "",
    type: "",
    priority: "",
    status: "",
    assignee: "",
    page: 1,
    per_page: 20,
  });

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem(KEY) : null), []);

  // Redirect if missing token (adjust route to your login)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!token) {
      router.push("/admin/login");
    }
  }, [token, router]);

  // Fetch contacts
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams(
          Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null))
        ).toString();
        const data = await apiFetch(`${API}/contacts${qs ? `?${qs}` : ""}`, {
          token,
          signal: ac.signal,
        });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const m = data?.meta || {};
        if (!alive) return;
        setItems(list);
        setMeta({
          page: m.current_page ?? filters.page ?? 1,
          per_page: m.per_page ?? filters.per_page ?? list.length ?? 20,
          last_page: m.last_page ?? 1,
          total: m.total ?? list.length ?? 0,
        });
        setSelected(new Set());
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Lỗi tải dữ liệu");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      ac.abort();
    };
  }, [filters, token]);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v, page: k === "per_page" ? 1 : s.page }));

  const allChecked = items.length > 0 && selected.size === items.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((x) => x.id)));
  };
  const toggleOne = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleAdd = () => router.push("/admin/contacts/new");
  const handleView = (id) => router.push(`/admin/contacts/${id}`);
  const handleEdit = (id) => router.push(`/admin/contacts/${id}/edit`);
  const handleDelete = async (id) => {
    if (!confirm("Xoá liên hệ này?")) return;
    try {
      await apiFetch(`${API}/contacts/${id}`, { method: "DELETE", token });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      alert("Đã xoá");
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return alert("Chưa chọn mục nào");
    if (!confirm(`Xoá ${selected.size} liên hệ đã chọn?`)) return;
    try {
      // If you have a bulk endpoint, call it here. Fallback: sequential
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => apiFetch(`${API}/contacts/${id}`, { method: "DELETE", token })));
      setItems((prev) => prev.filter((x) => !selected.has(x.id)));
      setSelected(new Set());
      alert("Đã xoá");
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Tên" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "channel", label: "Kênh" },
    { key: "type", label: "Loại" },
    { key: "priority", label: "Ưu tiên" },
    { key: "status", label: "Trạng thái" },
    { key: "assignee_name", label: "Phụ trách" },
    { key: "created_at", label: "Tạo lúc", renderRaw: (r) => r.created_at },
  ];

  const handleExport = () => {
    if (items.length === 0) return alert("Không có dữ liệu để xuất");
    const csv = toCSV(items, columns);
    downloadText(`contacts_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  };

  const uniqueFrom = (field) => {
    const setVals = new Set();
    items.forEach((it) => {
      const v = (it?.[field] ?? "").toString();
      if (v) setVals.add(v);
    });
    return Array.from(setVals);
  };

  const channels = useMemo(() => ["Form web", "Email", "Zalo", "Facebook", "Điện thoại", "Khác", ...uniqueFrom("channel")], [items]);
  const types = useMemo(() => ["Hỗ trợ", "Báo lỗi", "Tư vấn", "Khiếu nại", "Khác", ...uniqueFrom("type")], [items]);
  const priorities = ["Cao", "Trung bình", "Thấp"];
  const statuses = ["Mới", "Đang xử lý", "Hoàn tất", "Đã hủy"]; // map loosely in StatusBadge

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý liên hệ</h1>
        <div className="flex gap-2">
          <Link href="/admin/contacts/trash" className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <Trash2 size={16} /> Thùng rác
          </Link>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Thêm liên hệ
          </button>
          <button onClick={handleBulkDelete} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <Trash2 size={16} /> Xoá đã chọn
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => alert("TODO: Import CSV -> gọi API bulk")} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => setFilters((s) => ({ ...s }))} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-1 md:col-span-2 lg:col-span-2 flex">
          <div className="relative w-full">
            <input
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Từ khoá (Tên/Email/Phone/Nội dung)"
              className="w-full border rounded-lg px-3 py-2 pr-9"
            />
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <select value={filters.channel} onChange={(e) => set("channel", e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Kênh</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.type} onChange={(e) => set("type", e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Loại liên hệ</option>
          {types.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.priority} onChange={(e) => set("priority", e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Ưu tiên</option>
          {priorities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => set("status", e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Trạng thái</option>
          {statuses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={filters.assignee}
          onChange={(e) => set("assignee", e.target.value)}
          placeholder="Người phụ trách"
          className="border rounded-lg px-3 py-2"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Hiển thị</label>
          <select
            value={filters.per_page}
            onChange={(e) => set("per_page", Number(e.target.value) || 20)}
            className="border rounded-lg px-2 py-1"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">mục/trang</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 w-10">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="p-3 text-left">Khách hàng</th>
              <th className="p-3 text-left">Kênh</th>
              <th className="p-3 text-left">Loại</th>
              <th className="p-3 text-left">Ưu tiên</th>
              <th className="p-3 text-left">Trạng thái</th>
              <th className="p-3 text-left">Phụ trách</th>
              <th className="p-3 text-left">Tạo lúc</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Đang tải dữ liệu…
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-gray-500">
                  Không có liên hệ nào phù hợp.
                </td>
              </tr>
            )}

            {!loading && !error &&
              items.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50/60">
                  <td className="p-3 align-top">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{row.name || "(không tên)"}</div>
                    <div className="text-gray-500 text-xs flex gap-2 flex-wrap">
                      {row.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} /> {row.email}
                        </span>
                      )}
                      {row.phone && <span>• {row.phone}</span>}
                    </div>
                    {row.message && (
                      <div className="text-gray-600 text-xs mt-1 line-clamp-2 max-w-[52ch]">{row.message}</div>
                    )}
                  </td>
                  <td className="p-3 align-top">{row.channel || "—"}</td>
                  <td className="p-3 align-top">{row.type || "—"}</td>
                  <td className="p-3 align-top">
                    <PriorityBadge value={row.priority} />
                  </td>
                  <td className="p-3 align-top">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="p-3 align-top">{row.assignee_name || row.assignee || "—"}</td>
                  <td className="p-3 align-top text-gray-500">{formatDate(row.created_at)}</td>
                  <td className="p-3 align-top">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleView(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
                        title="Xem"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
                        title="Sửa"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 border rounded hover:bg-rose-50"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Tổng: <b>{meta.total}</b> — Trang {meta.page}/{meta.last_page}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={meta.page <= 1}
            onClick={() => set("page", Math.max(1, (meta.page || 1) - 1))}
            className="px-3 py-1.5 border rounded disabled:opacity-40"
          >
            Trước
          </button>
          <button
            disabled={meta.page >= meta.last_page}
            onClick={() => set("page", Math.min(meta.last_page, (meta.page || 1) + 1))}
            className="px-3 py-1.5 border rounded disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
