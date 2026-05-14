"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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

/** ====== Main Component ====== */
export default function EditSalePage() {
  const { id } = useParams();
  const router = useRouter();

  function pad(n) { return String(n).padStart(2, "0"); }
  function formatDatetimeLocal(d) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }
  function parseToLocalInput(dtStr) {
    if (!dtStr) return "";
    // Hỗ trợ cả "YYYY-MM-DD HH:MM:SS" và ISO
    const normalized = String(dtStr).includes("T") ? dtStr : String(dtStr).replace(" ", "T");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? "" : formatDatetimeLocal(d);
  }
  function toMySqlDateTime(localStr) {
    if (!localStr) return "";
    const d = new Date(localStr);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  }

  // State
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    product_id: "",
    price_sale: "",
    date_begin: "",
    date_end: "",
    status: 1,
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [err, setErr] = useState("");

  // Load sale data and products
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoadingData(true);
      setErr("");
      try {
        // Load sale data
        const saleData = await apiFetch(`${BASE}${API}/product-sale/${id}`);
        
        setForm({
          name: saleData.name || "",
          product_id: String(saleData.product_id),
          price_sale: String(saleData.price_sale || ""),
          date_begin: parseToLocalInput(saleData.date_begin),
          date_end: parseToLocalInput(saleData.date_end),
          status: saleData.status,
        });

        // Load products
        const productsData = await apiFetch(`${BASE}${API}/products?per_page=200&status=1`);
        setProducts(Array.isArray(productsData?.data) ? productsData.data : []);
      } catch (e) {
        setErr(e?.message || "Không tải được dữ liệu");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [id]);

  // Auto-fill product name
  useEffect(() => {
    if (form.product_id && !form.name) {
      const product = products.find(p => p.id === Number(form.product_id));
      if (product) {
        setForm(prev => ({ ...prev, name: product.name }));
      }
    }
  }, [form.product_id, products, form.name]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.product_id) {
      setErr("Vui lòng chọn sản phẩm");
      return;
    }
    if (!form.price_sale || Number(form.price_sale) <= 0) {
      setErr("Vui lòng nhập giá khuyến mãi hợp lệ");
      return;
    }
    if (!form.date_begin || !form.date_end) {
      setErr("Vui lòng chọn thời gian khuyến mãi");
      return;
    }
    // Validate end >= begin
    const beginMs = new Date(form.date_begin).getTime();
    const endMs = new Date(form.date_end).getTime();
    if (isFinite(beginMs) && isFinite(endMs) && endMs < beginMs) {
      setErr("Thời gian kết thúc phải lớn hơn hoặc bằng thời gian bắt đầu");
      return;
    }

    try {
      setLoading(true);
      await apiFetch(`${BASE}${API}/product-sale/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          product_id: Number(form.product_id),
          price_sale: Number(form.price_sale),
          date_begin: toMySqlDateTime(form.date_begin),
          date_end: toMySqlDateTime(form.date_end),
          status: Number(form.status),
          name: form.name || undefined,
        }),
      });

      alert("Cập nhật khuyến mãi thành công!");
      router.push(`/admin/products/sale/${id}`);
    } catch (e) {
      setErr(e?.message || "Cập nhật khuyến mãi thất bại");
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === Number(form.product_id));

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/admin/products/sale/${id}`}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa khuyến mãi</h1>
          <p className="text-gray-600 mt-1">Cập nhật thông tin khuyến mãi cho sản phẩm</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-6">
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        )}

        {/* Select Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn sản phẩm *
          </label>
          <select
            value={form.product_id}
            onChange={(e) => setForm(prev => ({ ...prev, product_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            required
            disabled={loading}
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} - {Math.round(p.price_buy || 0).toLocaleString("vi-VN")} đ
              </option>
            ))}
          </select>
        </div>

        {/* Product Info (if selected) */}
        {form.product_id && selectedProduct && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-blue-700 font-medium">Giá gốc</div>
                <div className="text-lg font-bold text-blue-900">
                  {Math.round(selectedProduct.price_buy || 0).toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-700 font-medium">Thông tin sản phẩm</div>
                <div className="text-sm text-blue-900">
                  ID: #{selectedProduct.id}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên chương trình (tự động điền)
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Sẽ tự động điền theo tên sản phẩm"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            disabled={loading}
          />
        </div>

        {/* Price & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giá khuyến mãi (₫) *
            </label>
            <input
              type="number"
              value={form.price_sale}
              onChange={(e) => setForm(prev => ({ ...prev, price_sale: e.target.value }))}
              min="0"
              step="1000"
              placeholder="250000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bắt đầu *
            </label>
            <input
              type="datetime-local"
              value={form.date_begin}
              onChange={(e) => setForm(prev => ({ ...prev, date_begin: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kết thúc *
            </label>
            <input
              type="datetime-local"
              value={form.date_end}
              onChange={(e) => setForm(prev => ({ ...prev, date_end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            disabled={loading}
          >
            <option value={1}>Bật</option>
            <option value={0}>Tắt</option>
          </select>
        </div>

        {/* Preview Discount */}
        {form.product_id && selectedProduct && form.price_sale && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-700 mb-2">Xem trước khuyến mãi</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Giá gốc</div>
                <div className="text-lg font-bold">
                  {Math.round(selectedProduct.price_buy || 0).toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div>
                <div className="text-gray-600">Giá KM</div>
                <div className="text-lg font-bold text-orange-600">
                  {Math.round(Number(form.price_sale)).toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div>
                <div className="text-gray-600">Tiết kiệm</div>
                <div className="text-lg font-bold text-green-600">
                  {selectedProduct.price_buy && (
                    <>
                      {Math.round(selectedProduct.price_buy - Number(form.price_sale)).toLocaleString("vi-VN")} đ
                      <span className="ml-1 text-xs">
                        ({Math.round(((selectedProduct.price_buy - Number(form.price_sale)) / selectedProduct.price_buy) * 100)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link
            href={`/admin/products/sale/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

