"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Eye } from "lucide-react";
import Link from "next/link";

/** ====== Config ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const ADMIN_TOKEN_KEY = "admin_token";

/** ====== Helpers ====== */
function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

function formatVND(n) {
  if (n == null || isNaN(Number(n))) return "";
  return Math.round(Number(n)).toLocaleString("vi-VN") + " đ";
}

function formatDate(dt) {
  if (!dt) return "";
  try {
    const d = parseMySqlDateTime(dt);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dt;
  }
}

function formatDateTime(dt) {
  if (!dt) return "";
  try {
    const d = parseMySqlDateTime(dt);
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

// Parse 'YYYY-MM-DD HH:MM:SS' as local time to avoid timezone shifts
function parseMySqlDateTime(s) {
  if (!s || typeof s !== "string") return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(s);
  const [_, yy, mm, dd, HH, MM, SS] = m;
  return new Date(
    Number(yy),
    Number(mm) - 1,
    Number(dd),
    Number(HH),
    Number(MM),
    Number(SS || 0),
    0
  );
}

function getDiscountTypeLabel(type) {
  const labels = {
    fixed: "Giảm cố định",
    percent: "Giảm theo %",
    free_ship: "Miễn phí ship"
  };
  return labels[type] || type;
}

/** ====== Main Component ====== */
export default function CouponsPage() {
  const router = useRouter();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Load data function
  const loadData = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (search) params.set("q", search);
      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }

      const data = await apiFetch(`${BASE}${API}/coupons?${params}`);
      
      setItems(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
    } catch (e) {
      setErr(e?.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Load data
  useEffect(() => {
    loadData();
  }, [page, perPage, filterStatus, search]);

  const handleDelete = async (id) => {
    if (!confirm("Xóa mã giảm giá này?")) return;
    try {
      await apiFetch(`${BASE}${API}/coupons/${id}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      alert("Xóa thất bại: " + e.message);
    }
  };

  const isActive = (coupon) => {
    const now = new Date();
    const start = parseMySqlDateTime(coupon.start_date);
    const end = parseMySqlDateTime(coupon.end_date);
    
    if (coupon.status !== 1) return false;
    if (now < start) return "upcoming";
    if (now > end) return "ended";

    // If there is a daily time window like "HH:MM-HH:MM", ensure now falls within it
    const win = coupon.time_restriction;
    if (win && typeof win === "string" && win.includes("-")) {
      const [s, e] = win.split("-");
      const toMinutes = (hhmm) => {
        const [hh, mm] = hhmm.split(":").map((x) => Number(x));
        if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
        return null;
      };
      const sMin = toMinutes(s);
      const eMin = toMinutes(e);
      if (sMin != null && eMin != null) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        // Only active when current time of day is inside the window
        if (nowMin < sMin || nowMin > eMin) {
          return "upcoming";
        }
      }
    }

    return "active";
  };

  const filteredItems = items;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý mã giảm giá</h1>
          <p className="text-gray-600 mt-1">Tạo và quản lý mã khuyến mãi, voucher</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/coupons/trash"
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Trash2 size={20} />
            Thùng rác
          </Link>
          <Link
            href="/admin/coupons/new"
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={20} />
            Tạo mã mới
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium">Tổng mã</div>
          <div className="text-2xl font-bold text-green-900">{total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium">Đang hiệu lực</div>
          <div className="text-2xl font-bold text-blue-900">
            {items.filter(c => isActive(c) === "active").length}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700 font-medium">Sắp diễn ra</div>
          <div className="text-2xl font-bold text-yellow-900">
            {items.filter(c => isActive(c) === "upcoming").length}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700 font-medium">Đã hết hạn</div>
          <div className="text-2xl font-bold text-gray-900">
            {items.filter(c => isActive(c) === "ended").length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã giảm giá..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            >
              <option value="all">Tất cả</option>
              <option value="1">Đang dùng</option>
              <option value="0">Đã tắt</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Hiển thị</label>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{err}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tên chương trình</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Loại giảm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Giá trị</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sử dụng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const active = isActive(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">#{item.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-blue-600">{item.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{getDiscountTypeLabel(item.discount_type)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold">
                          {item.discount_type === 'percent' 
                            ? `${item.discount_value}%`
                            : item.discount_type === 'fixed'
                            ? formatVND(item.discount_value)
                            : 'Miễn phí'}
                        </div>
                        {item.discount_type === 'percent' && item.max_discount && (
                          <div className="text-xs text-gray-500">Tối đa: {formatVND(item.max_discount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{formatDateTime(item.start_date)}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(item.end_date)}</div>
                        {item.time_restriction ? (
                          <div className="text-xs text-gray-500 mt-0.5">Khung giờ: {item.time_restriction}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{item.current_usage_count}</div>
                        {item.total_usage_limit > 0 && (
                          <div className="text-xs text-gray-400">/ {item.total_usage_limit}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {active === "active" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Đang hiệu lực
                          </span>
                        ) : active === "upcoming" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Sắp diễn ra
                          </span>
                        ) : active === "ended" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Đã hết hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Đã tắt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/coupons/${item.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/coupons/${item.id}/edit`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Trang {page} / {totalPages} • Tổng {total} bản ghi
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


