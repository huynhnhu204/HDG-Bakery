"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
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
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  // Read body once, then try to parse as JSON safely
  const bodyText = await res.text();
  let data = null;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch (e) {
    // Keep data as null; do not throw here to avoid confusing "Syntax error"
  }
  if (!res.ok) {
    // Log details for debugging but surface a friendly message
    // eslint-disable-next-line no-console
    console.error("API error:", { url, status: res.status, body: bodyText });
    throw new Error(`Không tải được dữ liệu (mã ${res.status})`);
  }
  return data ?? {};
}

function formatVND(n) {
  if (n == null || isNaN(Number(n))) return "";
  return Math.round(Number(n)).toLocaleString("vi-VN") + " đ";
}

function formatDate(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("vi-VN", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
export default function SaleDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // State
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Load data
  useEffect(() => {
    if (!id) return;
    
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch(`${BASE}${API}/product-sale/${id}`);
        setItem(data);
      } catch (e) {
        setErr(e?.message || "Không tải được dữ liệu");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // Delete
  async function handleDelete() {
    if (!confirm("Xóa khuyến mãi này?")) return;
    try {
      await apiFetch(`${BASE}${API}/product-sale/${id}`, { method: "DELETE" });
      alert("Đã xóa khuyến mãi");
      router.push("/admin/products/sale");
    } catch (e) {
      alert("Xóa thất bại: " + e.message);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (err || !item) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{err || "Không tìm thấy dữ liệu"}</p>
        </div>
        <div className="mt-4">
          <Link href="/admin/products/sale" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Quay về danh sách
          </Link>
        </div>
      </div>
    );
  }

  const buy = Number(item.product?.price_buy || 0);
  const sale = item.price_sale;
  const discount = buy > sale ? buy - sale : 0;
  const discountPercent = buy > 0 && discount > 0 ? Math.round((discount / buy) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/admin/products/sale" className="inline-flex items-center gap-2 hover:underline">
            <ArrowLeft size={16} /> Danh sách khuyến mãi
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">#{item.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/products/sale/${item.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Edit size={16} /> Sửa
          </Link>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
          >
            <Trash2 size={16} /> Xóa
          </button>
        </div>
      </div>

      {/* Title & Status */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {item.product?.name || item.name || "Sản phẩm khuyến mãi"}
            </h1>
            {item.name && item.name !== item.product?.name && (
              <p className="text-sm text-gray-600 mt-1">Tên chương trình: {item.name}</p>
            )}
          </div>
          <div>
            {isActive(item) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Đang diễn ra
              </span>
            ) : new Date() > new Date(item.date_end) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Đã kết thúc
              </span>
            ) : new Date() < new Date(item.date_begin) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Sắp diễn ra
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Đã tắt
              </span>
            )}
          </div>
        </div>

        {/* Pricing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium mb-1">Giá gốc</div>
            <div className="text-2xl font-bold text-green-900">
              {formatVND(buy) || "-"}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 font-medium mb-1">Giá khuyến mãi</div>
            <div className="text-2xl font-bold text-red-900">
              {formatVND(sale)}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-700 font-medium mb-1">Tiết kiệm</div>
            <div className="text-2xl font-bold text-orange-900">
              -{formatVND(discount)}
            </div>
            <div className="text-sm text-orange-600 mt-1">
              ({discountPercent}%)
            </div>
          </div>
        </div>
      </div>

      {/* Time Info */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thời gian khuyến mãi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Bắt đầu</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDate(item.date_begin)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Kết thúc</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDate(item.date_end)}
            </div>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin sản phẩm</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Mã sản phẩm</div>
            <div className="text-sm font-medium text-gray-900">
              {item.product_id ? `#${item.product_id}` : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Danh mục</div>
            <div className="text-sm font-medium text-gray-900">
              {item.product?.category?.name || "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">SKU</div>
            <div className="text-sm font-medium text-gray-900">
              {item.product?.sku || "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Tồn kho</div>
            <div className="text-sm font-medium text-gray-900">
              {item.product?.quantity ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin hệ thống</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Trạng thái</div>
            <div className="text-sm font-medium">
              <span className={`inline-flex px-2 py-1 rounded-full ${
                item.status === 1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              }`}>
                {item.status === 1 ? "Bật" : "Tắt"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Ngày tạo</div>
            <div className="text-sm font-medium text-gray-900">
              {item.created_at ? formatDate(item.created_at) : "-"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Ngày cập nhật</div>
            <div className="text-sm font-medium text-gray-900">
              {item.updated_at ? formatDate(item.updated_at) : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Link href="/admin/products/sale" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <ArrowLeft size={16} /> Quay về danh sách
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/products/sale/${item.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Edit size={16} /> Sửa
          </Link>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
          >
            <Trash2 size={16} /> Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

