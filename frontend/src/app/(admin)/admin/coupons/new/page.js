"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";

function getToken() {
  try {
    return localStorage.getItem("admin_token");
  } catch {
    return null;
  }
}

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    discount_type: "percent",
    discount_value: "",
    max_discount: "",
    min_order_amount: "",
    apply_to: "all",
    category_ids: [],
    product_ids: [],
    exclude_product_ids: [],
    delivery_method: "all",
    advance_hours: "0",
    customer_restriction: "all",
    exclude_sale_items: false,
    start_date: "",
    end_date: "",
    time_start: "", // HH:MM
    time_end: "",   // HH:MM
    total_usage_limit: "",
    usage_per_customer: "1",
    allowed_customer_emails: [],
    can_stack_with_ship: false,
    success_message: "",
    error_message: "",
    status: 1,
  });

  // Load products and categories for restrictions
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${BASE}${API}/products?per_page=100&status=1`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setProducts([]));

    fetch(`${BASE}${API}/categories`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setCategories([]));
  }, []);

  // Prefill default start/end datetimes for convenience
  useEffect(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const formatDatetimeLocal = (d) => {
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    };
    if (!form.start_date || !form.end_date) {
      const now = new Date();
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 0, 0);
      setForm((prev) => ({
        ...prev,
        start_date: prev.start_date || formatDatetimeLocal(start),
        end_date: prev.end_date || formatDatetimeLocal(end),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: [...prev[field], value].filter((v, i, arr) => arr.indexOf(v) === i)
    }));
  };

  const removeFromArray = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter(v => v !== value)
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setOkMsg("");

    try {
      // Helpers: convert datetime-local to 'YYYY-MM-DD HH:MM:SS' (MySQL DATETIME)
      const pad = (n) => String(n).padStart(2, "0");
      const toMySqlDateTime = (localStr) => {
        if (!localStr) return "";
        const d = new Date(localStr);
        if (Number.isNaN(d.getTime())) {
          throw new Error("Ngày/giờ không hợp lệ");
        }
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
      };

      // Build time restriction from pickers
      let timeRestriction = "";
      if (form.time_start && form.time_end) {
        timeRestriction = `${form.time_start}-${form.time_end}`;
      }

      // Basic validation: start < end
      if (timeRestriction) {
        const [s,e2] = timeRestriction.split("-");
        if (s && e2 && s >= e2) {
          throw new Error("Khoảng giờ không hợp lệ (giờ bắt đầu phải trước giờ kết thúc)");
        }
      }

      // Validate date range start < end
      const startMySql = toMySqlDateTime(form.start_date);
      const endMySql = toMySqlDateTime(form.end_date);
      const startJs = new Date(startMySql.replace(" ", "T"));
      const endJs = new Date(endMySql.replace(" ", "T"));
      if (!(startJs < endJs)) {
        throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
      }

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        apply_to: form.apply_to,
        category_ids: form.apply_to === 'category' ? form.category_ids : null,
        product_ids: form.apply_to === 'product' ? form.product_ids : null,
        exclude_product_ids: form.exclude_product_ids.length > 0 ? form.exclude_product_ids : null,
        delivery_method: form.delivery_method,
        advance_hours: Number(form.advance_hours),
        customer_restriction: form.customer_restriction,
        exclude_sale_items: form.exclude_sale_items,
        // Normalize to MySQL DATETIME to avoid timezone parsing issues
        start_date: startMySql,
        end_date: endMySql,
        time_restriction: timeRestriction || null,
        total_usage_limit: form.total_usage_limit ? Number(form.total_usage_limit) : 0,
        usage_per_customer: Number(form.usage_per_customer),
        allowed_customer_emails: form.allowed_customer_emails.length > 0 ? form.allowed_customer_emails : null,
        can_stack_with_ship: form.can_stack_with_ship,
        success_message: form.success_message.trim() || null,
        error_message: form.error_message.trim() || null,
        status: form.status,
      };

      const res = await fetch(`${BASE}${API}/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Tạo mã thất bại");
      }

      setOkMsg("Tạo mã giảm giá thành công!");
      setTimeout(() => {
        router.push("/admin/coupons");
      }, 1500);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tạo mã giảm giá mới</h1>
          <p className="text-gray-600 mt-2">Thiết lập các điều kiện và giới hạn cho mã khuyến mãi</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* 1. Thông tin cơ bản */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">1. Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên chương trình *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="VD: Mừng khai trương"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã giảm giá *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                  placeholder="VD: BANH20"
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Mô tả ngắn về chương trình..."
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* 2. Loại giảm giá */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">2. Loại giảm giá</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="percent"
                  checked={form.discount_type === "percent"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                />
                <span>Giảm theo %</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="fixed"
                  checked={form.discount_type === "fixed"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                />
                <span>Giảm số tiền cố định</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="free_ship"
                  checked={form.discount_type === "free_ship"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                />
                <span>Miễn phí ship</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {form.discount_type === "percent" ? "Phần trăm giảm (%) *" : 
                   form.discount_type === "fixed" ? "Số tiền giảm (VND) *" : 
                   "Không cần"}
                </label>
                {form.discount_type !== "free_ship" && (
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.discount_value}
                    onChange={(e) => updateForm("discount_value", e.target.value)}
                    placeholder={form.discount_type === "percent" ? "20" : "50000"}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                )}
                {form.discount_type === "free_ship" && (
                  <p className="text-sm text-gray-500">Tự động miễn phí ship khi áp dụng</p>
                )}
              </div>
              {form.discount_type === "percent" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tối đa giảm (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => updateForm("max_discount", e.target.value)}
                    placeholder="50000"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Đơn tối thiểu (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={form.min_order_amount}
                  onChange={(e) => updateForm("min_order_amount", e.target.value)}
                  placeholder="200000"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* 3. Thời gian hiệu lực */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">3. Thời gian hiệu lực</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => updateForm("start_date", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày kết thúc *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => updateForm("end_date", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Khung giờ trong ngày (tùy chọn)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Từ giờ</span>
                    <input
                      type="time"
                      value={form.time_start}
                      onChange={(e) => updateForm("time_start", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Đến giờ</span>
                    <input
                      type="time"
                      value={form.time_end}
                      onChange={(e) => updateForm("time_end", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Để trống cả 2 ô nếu áp dụng cả ngày.</p>
              </div>
            </div>
          </section>

          {/* 4. Giới hạn sử dụng */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">4. Giới hạn sử dụng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tổng số lần dùng</label>
                <input
                  type="number"
                  min="0"
                  value={form.total_usage_limit}
                  onChange={(e) => updateForm("total_usage_limit", e.target.value)}
                  placeholder="0 = không giới hạn"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số lần / 1 khách</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.usage_per_customer}
                  onChange={(e) => updateForm("usage_per_customer", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* 5. Thông điệp hiển thị */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">5. Thông điệp hiển thị</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Thông báo thành công</label>
                <input
                  value={form.success_message}
                  onChange={(e) => updateForm("success_message", e.target.value)}
                  placeholder="VD: Áp dụng mã BANH20: giảm 20%"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thông báo lỗi</label>
                <input
                  value={form.error_message}
                  onChange={(e) => updateForm("error_message", e.target.value)}
                  placeholder="VD: Mã chỉ áp cho đơn từ 200k"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* Trạng thái */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Trạng thái</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={1}
                  checked={form.status === 1}
                  onChange={(e) => updateForm("status", Number(e.target.value))}
                />
                <span>Đang hoạt động</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={0}
                  checked={form.status === 0}
                  onChange={(e) => updateForm("status", Number(e.target.value))}
                />
                <span>Tạm tắt</span>
              </label>
            </div>
          </section>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo mã giảm giá"}
            </button>
          </div>

          {err && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{err}</p>
            </div>
          )}
          {okMsg && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{okMsg}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

