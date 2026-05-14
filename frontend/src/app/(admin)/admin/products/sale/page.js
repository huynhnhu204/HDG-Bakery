"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Upload, Eye } from "lucide-react";
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
    const d = new Date(dt);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dt;
  }
}

function isActive(item) {
  const now = new Date();
  const begin = new Date(item.date_begin);
  const end = new Date(item.date_end);
  return item.status === 1 && now >= begin && now <= end;
}

/** ====== Main Component ====== */
export default function SaleManagementPage() {
  const router = useRouter();

  // State
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, ended, upcoming
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Load data function
  const loadData = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (search) params.set("q", search);
      if (filterStatus !== "all") {
        params.set("active", filterStatus === "active" ? "true" : "false");
      }

      const data = await apiFetch(`${BASE}${API}/product-sale?${params}`);
      
      // Debug log
      console.log('API Response:', data);
      
      setItems(Array.isArray(data?.data) ? data.data : []);
      setTotal(data?.total || 0);
    } catch (e) {
      setErr(e?.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filterStatus, search]);

  // Load data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, perPage]);

  // Check for newly created sale and reload
  useEffect(() => {
    const createdFlag = sessionStorage.getItem('sale_created');
    if (createdFlag) {
      try {
        const info = JSON.parse(createdFlag);
        console.log('Sale created:', info);
        sessionStorage.removeItem('sale_created');
        // Reload data to show new sale
        loadData();
      } catch (e) {
        console.error('Error reading sale_created:', e);
      }
    }
  }, [loadData]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch(`${BASE}${API}/products?per_page=100&status=1`);
      setProducts(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Xóa khuyến mãi này?")) return;
    try {
      await apiFetch(`${BASE}${API}/product-sale/${id}`, { method: "DELETE" });
      loadData();
    } catch (e) {
      alert("Xóa thất bại: " + e.message);
    }
  }, [loadData]);

  const filteredItems = items;
  const totalPages = Math.ceil(total / perPage);

  // Build a compact page list: 1 ... x-1 x x+1 ... last
  function getPageList(cur, last) {
    if (last <= 7) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }
    const pages = new Set([1, last, cur, cur - 1, cur + 1, 2, last - 1]);
    const arr = Array.from(pages).filter(p => p >= 1 && p <= last).sort((a, b) => a - b);
    // Insert gaps as -1 (for ellipsis)
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(arr[i]);
      if (i < arr.length - 1 && arr[i + 1] > arr[i] + 1) {
        result.push(-1);
      }
    }
    return result;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý khuyến mãi</h1>
          <p className="text-gray-600 mt-1">Danh sách sản phẩm đã thiết lập khuyến mãi</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/products/sale/new"
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Plus size={20} />
            Tạo khuyến mãi
          </Link>
          <button
            onClick={() => router.push("/admin/products/sale/import")}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Upload size={20} />
            Import
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium">Tổng khuyến mãi</div>
          <div className="text-2xl font-bold text-green-900">{total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium">Đang diễn ra</div>
          <div className="text-2xl font-bold text-blue-900">
            {items.filter(isActive).length}
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700 font-medium">Sắp diễn ra</div>
          <div className="text-2xl font-bold text-yellow-900">
            {items.filter(i => {
              const now = new Date();
              const begin = new Date(i.date_begin);
              return now < begin && i.status === 1;
            }).length}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700 font-medium">Đã kết thúc</div>
          <div className="text-2xl font-bold text-gray-900">
            {items.filter(i => new Date() > new Date(i.date_end)).length}
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
                placeholder="Tìm theo tên sản phẩm hoặc chương trình..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Lọc theo</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang diễn ra</option>
              <option value="ended">Đã kết thúc</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Giá gốc</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Giá KM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Giảm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">#{item.id}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/products/sale/${item.id}`)}
                        className="font-medium text-gray-900 hover:text-blue-600 text-left"
                      >
                        {item.product?.name || item.name || `Sản phẩm #${item.product_id}`}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {item.product?.price_buy ? formatVND(item.product.price_buy) : "-"}
                      </div>
                      {item.product?.price_buy && item.product.price_buy > item.price_sale && (
                        <div className="text-xs text-gray-500 mt-1">
                          Giá gốc
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-red-600">
                        {formatVND(item.price_sale)}
                      </div>
                      {item.product?.price_buy && item.product.price_buy > item.price_sale && (
                        <div className="text-xs text-gray-500 mt-1">
                          Giá sale
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.product?.price_buy && item.product.price_buy > item.price_sale ? (
                        <>
                          <div className="text-sm font-bold text-green-600">
                            -{formatVND(item.product.price_buy - item.price_sale)}
                          </div>
                          <div className="text-xs text-orange-600 font-bold">
                            ({Math.round(((item.product.price_buy - item.price_sale) / item.product.price_buy) * 100)}%)
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatDate(item.date_begin)}</div>
                      <div className="text-xs text-gray-400">{formatDate(item.date_end)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isActive(item) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Đang diễn ra
                        </span>
                      ) : new Date() > new Date(item.date_end) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Đã kết thúc
                        </span>
                      ) : new Date() < new Date(item.date_begin) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sắp diễn ra
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
                          onClick={() => router.push(`/admin/products/sale/${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/products/sale/${item.id}/edit`)}
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
                ))
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
            <nav className="flex items-center gap-2" aria-label="Pagination">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2.5 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Trang đầu"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Trang trước"
              >
                ‹
              </button>
              {getPageList(page, totalPages).map((p, idx) =>
                p === -1 ? (
                  <span key={`gap-${idx}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 border rounded-lg text-sm hover:bg-gray-100 ${p === page ? "bg-black text-white border-black hover:bg-black" : ""}`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Trang sau"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2.5 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                title="Trang cuối"
              >
                »
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
