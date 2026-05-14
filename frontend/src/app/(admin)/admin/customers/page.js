"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

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
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

export default function AdminCustomersPage() {
  const router = useRouter();

  // filters + paging
  const [filters, setFilters] = useState({ q: "", group: "", status: "", level: "" });
  const [perPage, setPerPage] = useState(20);
  const [page, setPage]       = useState(1);

  // data state
  const [customers, setCustomers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [lastPage, setLastPage]   = useState(1);
  const [loading, setLoading]     = useState(true);

  // helpers
  const setFilter = (k, v) => {
    setPage(1);
    setFilters((s) => ({ ...s, [k]: v }));
  };

  // load customers
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q)       params.set("q", filters.q);
      if (filters.group)   params.set("group", filters.group);
      if (filters.level)   params.set("membership_level", filters.level);
      if (filters.status !== "") params.set("status", filters.status);
      params.set("per_page", String(perPage));
      params.set("page", String(page));

      const data = await jfetch(`${BASE}${API}/customers?` + params.toString());
      const rows = Array.isArray(data) ? data : (data?.data || []);
      setCustomers(rows);
      setTotal(data?.total ?? rows.length ?? 0);
      setLastPage(data?.last_page ?? 1);
    } catch (err) {
      console.error("Load customers error:", err);
    } finally {
      setLoading(false);
    }
  };

  // first load
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  // reactive load
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [filters, perPage, page]);

  // actions
  const toggleStatus = async (id) => {
    try {
      await jfetch(`${BASE}${API}/customers/${id}/toggle`, { method: "POST" });
      fetchData();
    } catch (e) {
      alert(e.message || "Đổi trạng thái thất bại");
    }
  };

  const deleteCustomer = async (id) => {
    if (!confirm("Bạn có chắc muốn xoá khách hàng này?")) return;
    try {
      await jfetch(`${BASE}${API}/customers/${id}`, { method: "DELETE" });
      // nếu BE dùng SoftDeletes: bản ghi sẽ biến mất khỏi danh sách active
      fetchData();
    } catch (e) {
      alert(e.message || "Xoá thất bại");
    }
  };

  // ===== Membership helpers =====
  const fmtVND = (n) => (Number(n)||0).toLocaleString("vi-VN") + "đ";
  const levels = [
    { key: "",        label: "Hạng (tất cả)" },
    { key: "dong",    label: "Đồng" },
    { key: "bac",     label: "Bạc" },
    { key: "vang",    label: "Vàng" },
    { key: "bachkim", label: "Bạch Kim" },
  ];

  async function recomputeForUserId(userId) {
    // Use membership/me endpoint needs auth of that user; instead, trigger via admin by toggling delivered orders is complex.
    // We call adminUpdate with no change to force BE to recompute via a dedicated endpoint if available.
    // As a pragmatic approach, call backend Customer adminUpdate with same payload to touch updated_at (no-op BE recomputation not available by default).
    // You can add a dedicated admin endpoint later; for now, this button is informational.
    alert("Recompute is automatic on order delivery. Manual recompute endpoint can be added on backend if needed.");
  }

  async function setLevel(customerId, levelKey, label) {
    try {
      await jfetch(`${BASE}${API}/customers/${customerId}`, {
        method: "PUT",
        body: { membership_level: levelKey, membership_label: label },
      });
      fetchData();
    } catch (e) {
      alert(e.message || "Cập nhật hạng thất bại");
    }
  }

  // OPTIONAL: badge đếm thùng rác
  const [trashTotal, setTrashTotal] = useState(0);
  const refreshTrashCount = async () => {
    try {
      // yêu cầu BE có /customers/trash trả về paginator
      const data = await jfetch(`${BASE}${API}/customers/trash?per_page=1&page=1`);
      setTrashTotal(data?.total ?? 0);
    } catch { setTrashTotal(0); }
  };
  useEffect(() => { refreshTrashCount(); }, []);

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(total, page * perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/customers/trash"
            className="px-3 py-2 border rounded-lg hover:bg-gray-100 inline-flex items-center gap-2"
            title="Thùng rác khách hàng"
          >
            <Archive size={16} />
            Thùng rác
            <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-gray-900 text-white text-xs">
              {trashTotal}
            </span>
          </Link>
          <button
            onClick={() => router.push("/admin/customers/new")}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            + Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Filters */}
      <section className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Tìm kiếm & Bộ lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            placeholder="Tên/Email/SĐT"
            className="border rounded px-3 py-2 w-full"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={filters.group}
            onChange={(e) => setFilter("group", e.target.value)}
          >
            <option value="">Nhóm KH</option>
            <option value="VIP">VIP</option>
            <option value="Normal">Thường</option>
          </select>
          <select
            className="border rounded px-3 py-2"
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">Trạng thái</option>
            <option value="1">Hoạt động</option>
            <option value="0">Khoá</option>
          </select>
          <select
            className="border rounded px-3 py-2"
            value={filters.level}
            onChange={(e) => setFilter("level", e.target.value)}
          >
            {levels.map(l => <option key={l.key || 'all'} value={l.key}>{l.label}</option>)}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}/trang</option>)}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => { setFilters({ q: "", group: "", status: "" }); setPage(1); }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 w-full"
              title="Xoá bộ lọc"
            >
              Xoá bộ lọc
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Tên</th>
              <th className="p-2 text-left">SĐT</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Nhóm</th>
              <th className="p-2 text-left">Hạng TV</th>
              <th className="p-2 text-left">Tổng đơn</th>
              <th className="p-2 text-left">Tổng chi</th>
              <th className="p-2 text-left">Trạng thái</th>
              <th className="p-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">Đang tải...</td>
              </tr>
            )}

            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  Không tìm thấy khách hàng nào
                </td>
              </tr>
            )}

            {!loading && customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="p-2">{c.id}</td>
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.phone || "—"}</td>
                <td className="p-2">{c.email || "—"}</td>
                <td className="p-2">{c.group || "—"}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full border text-xs">
                      {c.membership_label || (c.membership_level || "—")}
                    </span>
                    <div className="relative group">
                      <button className="px-2 py-0.5 text-xs border rounded hover:bg-gray-100">Đổi</button>
                      <div className="absolute z-10 hidden group-hover:block bg-white border rounded shadow-lg mt-1">
                        {levels.filter(l=>l.key).map(l => (
                          <button key={l.key} className="block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-xs"
                            onClick={(e)=> { e.preventDefault(); setLevel(c.id, l.key, l.label); }}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </span>
                </td>
                <td className="p-2">{c.total_orders ?? 0}</td>
                <td className="p-2">{fmtVND(c.total_spent ?? 0)}</td>
                <td className="p-2">
                  {Number(c.status) === 1 ? (
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-600">Hoạt động</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600">Khoá</span>
                  )}
                </td>
                <td className="p-2 text-right space-x-2">
                  <button
                    onClick={() => router.push(`/admin/customers/${c.id}`)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Xem chi tiết"
                  >👁️</button>
                  <button
                    onClick={() => router.push(`/admin/customers/${c.id}/edit`)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Sửa"
                  >✏️</button>
                  <button
                    onClick={() => recomputeForUserId(c.user_id)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Tính lại hạng (theo đơn giao thành công)"
                  >♻️</button>
                  <button
                    onClick={() => toggleStatus(c.id)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title={Number(c.status) === 1 ? "Khoá" : "Mở khoá"}
                  >{Number(c.status) === 1 ? "🔒" : "🔓"}</button>
                  <button
                    onClick={() => deleteCustomer(c.id)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Xoá"
                  >🗑️</button>
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
    </div>
  );
}
